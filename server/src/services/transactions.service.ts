import { Request } from "express";
import { prisma } from "../libs/prisma";
import { Prisma, Status_transaction } from "@prisma/client";
import dayjs from "dayjs";
import { catchError, throwErrorMessageIf } from "../utils/error";
import { TEvent } from "../models/event.model";
import { discCalc } from "../utils/calc";
import { sendPaymentNotice, sendTicket } from "../libs/nodemailer";

class TransactionService {
	async getChartData(req: Request) {
		const { month, year, type } = req.chart_query;
		const { username } = req.user;
		let result: any[] = [];
		if (type === "month") {
			result = await prisma.$queryRaw`
			SELECT e.category, SUM(ticket_bought) AS ticket_sales
			FROM transactions AS t
			JOIN events AS e ON e.id = t.event_id
			JOIN users AS u ON u.id = e.user_id
			WHERE u.username = ${username}
				AND t.status = ${Status_transaction.success}::"Status_transaction"
				AND EXTRACT(MONTH FROM t.created_at) = ${month}
				AND EXTRACT(YEAR FROM t.created_at) = ${year}
			GROUP BY e.category`;
		} else if (type === "day") {
			result = await prisma.$queryRaw`
			SELECT e.category, SUM(ticket_bought) AS ticket_sales
			FROM transactions AS t
			JOIN events AS e ON e.id = t.event_id
			JOIN users AS u ON u.id = e.user_id
			WHERE u.username = ${username}
				AND t.status = ${Status_transaction.success}::"Status_transaction"
				AND DATE(t.created_at) = CURRENT_DATE
			GROUP BY e.category`;
		} else if (type === "year") {
			result = await prisma.$queryRaw`
			SELECT e.category, SUM(ticket_bought) AS ticket_sales
			FROM transactions AS t
			JOIN events AS e ON e.id = t.event_id
			JOIN users AS u ON u.id = e.user_id
			WHERE u.username = ${username}
				AND t.status = ${Status_transaction.success}::"Status_transaction"
				AND EXTRACT(YEAR FROM t.created_at) = ${year}
			GROUP BY e.category`;
		} else {
			throw new Error("invalid type");
		}

		const safeResult = result.map((row: any) => ({
			...row,
			ticket_sales: row.ticket_sales?.toString(),
		}));

		return safeResult;
	}
	async getCustomerTransactions(req: Request) {
		const { sort_by, sort, search, status, page } = req.query as {
			sort_by: string;
			sort: string;
			search: string;
			status?: Status_transaction;
			page: string;
		};
		const limit = 5;
		const { id: user_id } = req?.user;
		const total = await prisma.transaction.count({
			where: {
				user_id,
				status,
				AND: [
					{
						OR: [
							{ invoice_code: { contains: search } },
							{ event: { title: { contains: search } } },
							{ event: { user: { username: { contains: search } } } },
						],
					},
				],
			},
		});
		const data = await prisma.transaction.findMany({
			where: {
				user_id,
				status,
				AND: [
					{
						OR: [
							{ invoice_code: { contains: search } },
							{ event: { title: { contains: search } } },
							{ event: { user: { username: { contains: search } } } },
						],
					},
				],
			},
			orderBy: [{ [sort_by]: sort }],
			include: {
				event: {
					select: {
						title: true,
						scheduled_at: true,
						start_time: true,
						end_time: true,
						ticket_price: true,
						discount_amount: true,
						status: true,
						user: {
							select: {
								avatar: true,
								username: true,
								bank_acc_no: true,
							},
						},
					},
				},
			},
			take: limit,
			skip: (Number(page) - 1) * limit,
		});
		throwErrorMessageIf(!data, "Transaction not found.");
		return { data, total: Math.ceil(total / limit) };
	}

	async getPromotorTransactions(req: Request) {
		const {
			sort_by = "created_at",
			sort = "desc",
			search = "",
			status,
			page = "1",
		} = req.query as unknown as {
			sort_by: string;
			sort: string;
			search: string;
			status?: Status_transaction;
			page: string;
		};
		const limit = 5;
		const { id: user_id } = req?.user;
		const total = await prisma.transaction.count({
			where: {
				event: {
					user_id,
				},
				status,
				OR: [
					{ invoice_code: { contains: search } },
					{
						event: {
							title: { contains: search },
						},
					},
					{
						user: {
							username: {
								contains: search,
							},
						},
					},
				],
			},
		});
		const data = await prisma.transaction.findMany({
			where: {
				event: {
					user_id,
				},
				status,
				OR: [
					{ invoice_code: { contains: search } },
					{
						event: {
							title: { contains: search },
						},
					},
					{
						user: {
							username: {
								contains: search,
							},
						},
					},
				],
			},
			include: {
				event: {
					select: {
						title: true,
						scheduled_at: true,
						start_time: true,
						end_time: true,
						ticket_price: true,
						discount_amount: true,
						status: true,
						user: {
							select: {
								avatar: true,
								username: true,
								bank_acc_no: true,
							},
						},
					},
				},
				user: {
					select: {
						avatar: true,
						username: true,
					},
				},
			},
			orderBy: [{ [sort_by]: sort }],
			take: limit,
			skip: (Number(page) - 1) * limit,
		});
		throwErrorMessageIf(!data, "Transaction not found.");
		return { data, total: Math.ceil(total / limit) };
	}
	async create(req: Request) {
		const { id: event_id } = req.event as TEvent;
		const {
			ticket_bought,
			points,
			voucher_id,
		}: {
			ticket_bought: number;
			points?: number;
			voucher_id?: string;
		} = req.body;
		throwErrorMessageIf(!ticket_bought, "Specify amount of ticket to buy.");
		throwErrorMessageIf(
			req.event.ticket_amount! < ticket_bought,
			"Limit exceeded."
		);
		let total_price = req.event.ticket_price! * Number(ticket_bought);
		await prisma.$transaction(async (prisma) => {
			try {
				let data: Prisma.TransactionCreateInput = {
					invoice_code: `INV/${dayjs().format("YYYYMMDD/hhmm")}-${
						req.user.username
					}`,
					ticket_bought: Number(ticket_bought),
					total_price,
					user: {
						connect: {
							id: req.user.id,
						},
					},
					event: {
						connect: {
							id: event_id as string,
						},
					},
				};
				if (req.event.discount_amount) {
					data.ticket_discount = req.event.discount_amount;
					data.total_price = total_price -= discCalc(
						total_price,
						req.event.discount_amount
					);
				}
				let input_points = Number(points);
				const isPointsGteTotalPrice = input_points >= total_price;
				if (input_points) {
					data.total_price = isPointsGteTotalPrice
						? 0
						: (total_price -= input_points);
					data.points_used = input_points;
					await prisma.user.update({
						where: {
							id: req.user.id,
						},
						data: {
							points: isPointsGteTotalPrice ? input_points - total_price : 0,
						},
					});
				}
				if (voucher_id) {
					throwErrorMessageIf(
						!req.event.ticket_price,
						"Not applicable on free event."
					);
					const voucher = await prisma.voucher.update({
						where: {
							id: voucher_id,
						},
						data: {
							is_valid: false,
						},
						select: {
							amount: true,
						},
					});
					throwErrorMessageIf(!voucher, "Voucher not found.");
					data = { ...data, voucher: { connect: { id: voucher_id } } };
					data.total_price = total_price -= discCalc(
						total_price,
						voucher.amount
					);
				}
				if (!req.event.ticket_price || input_points >= total_price) {
					data.status = Status_transaction.success;
					sendTicket({
						email_to: req.user.email,
						template_dir: "../templates/ticket.html",
						subject: `Ticket issued. Hi ${req.user.username}! Enjoy your tickets!`,
						username: req.user.username,
						title: req.event.title,
						tickets: String(ticket_bought),
						location: req.event.location,
						date: dayjs(req.event.scheduled_at).format("YYYY/MM/DD"),
						time: `${dayjs(req.event.start_time).format("hh:mm")} - ${dayjs(
							req.event.end_time
						).format("hh:mm")}`,
					});
				} else {
					sendPaymentNotice({
						email_to: req.user.email,
						template_dir: "../templates/payment-notice.html",
						username: req.user.username,
						bank_acc_no: req.event.user?.bank_acc_no!,
						subject: "Just a little bit more to hold em' tickets!",
						tickets: String(ticket_bought),
						event_title: req.event.title,
						total_price: total_price.toLocaleString("id-ID", {
							style: "currency",
							currency: "IDR",
						}),
					});
				}
				await prisma.transaction.create({
					data,
				});
				await prisma.event.update({
					where: {
						id: event_id,
					},
					data: {
						ticket_amount: req.event.ticket_amount! - ticket_bought,
					},
				});
			} catch (error) {
				catchError(error);
			}
		});
	}
	async update(req: Request) {
		const { id } = req.params;
		const transfer_proof = req.file?.filename as string;
		await prisma.transaction.update({
			where: {
				id,
			},
			data: {
				status: Status_transaction.pending,
				transfer_proof,
			},
		});
	}
	async confirm(req: Request) {
		const { id } = req.params;
		const data = await prisma.$transaction(async (prisma) => {
			const res = await prisma.transaction.findFirst({
				where: {
					id,
				},
				include: {
					event: true,
					user: true,
				},
			});
			await prisma.transaction.update({
				where: {
					id,
				},
				data: {
					status: Status_transaction.success,
					paid_at: dayjs().toDate(),
				},
			});
			return res;
		});
		sendTicket({
			email_to: data?.user.email || "",
			subject: `Ticket issued. [TicketID:${data?.id}] - We have confirmed your purchase.`,
			template_dir: "../templates/ticket.html",
			username: data?.user.username || "",
			title: data?.event.title!,
			tickets: `${data?.ticket_bought}`,
			location: data?.event.location!,
			date: dayjs(data?.event.scheduled_at).format("YYYY/MM/DD"),
			time: `${dayjs(data?.event.start_time).format("HH:mm")} - ${dayjs(
				data?.event.end_time
			).format("HH:mm")}`,
		});
	}
	async delete(req: Request) {
		//transaction id
		const { id } = req.params;
		await prisma.$transaction(async (prisma) => {
			const payment = await prisma.transaction.findFirst({
				where: { id },
				select: {
					paid_at: true,
					created_at: true,
					event_id: true,
					ticket_bought: true,
					voucher_id: true,
					points_used: true,
					status: true,
					event: {
						select: {
							ticket_amount: true,
						},
					},
					user: {
						select: {
							id: true,
							points: true,
						},
					},
				},
			});
			throwErrorMessageIf(!payment, "Transaction not found.");
			throwErrorMessageIf(
				req.user.role === "promotor" &&
					dayjs(payment?.created_at).add(1, "day") >= dayjs(),
				"Transaction can be cancelled after 24 hours since made."
			);
			await prisma.event.update({
				where: { id: payment?.event_id },
				data: {
					ticket_amount:
						payment?.ticket_bought! + payment?.event.ticket_amount!,
				},
			});
			if (payment?.voucher_id) {
				await prisma.voucher.update({
					where: { id: payment.voucher_id },
					data: {
						is_valid: true,
					},
				});
			}
			if (payment?.points_used) {
				await prisma.user.update({
					where: {
						id: payment.user.id,
					},
					data: {
						points: payment.user.points + payment.points_used,
					},
				});
			}
			await prisma.transaction.update({
				where: { id },
				data: {
					status: Status_transaction.cancelled,
				},
			});
		});
	}
}

export default new TransactionService();
