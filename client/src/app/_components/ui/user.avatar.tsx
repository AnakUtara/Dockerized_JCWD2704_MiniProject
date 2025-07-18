import { TUser } from "@/app/_models/user.model";
import { Avatar, AvatarImageProps } from "flowbite-react";
import Image from "next/image";

type Props = {
  user: TUser;
  size?: string;
  bordered?: boolean;
  avatarPreview?: string | null;
};
export default function UserAvatar({
  user,
  size = "md",
  bordered = false,
  avatarPreview,
}: Props) {
  return (
    <Avatar
      alt={`${user.username}'s avatar`}
      img={
        !user.avatar && !avatarPreview
          ? ""
          : (props: AvatarImageProps) => {
              props.className += " my-0 object-cover";
              return (
                <Image
                  alt={`${user.username}'s avatar`}
                  height="48"
                  referrerPolicy="no-referrer"
                  src={
                    avatarPreview ||
                    `${process.env.NEXT_PUBLIC_API_IMAGES_URL}/avatars/${user.avatar}`
                  }
                  width="48"
                  {...props}
                />
              );
            }
      }
      rounded
      size={size}
      bordered={bordered}
      color={"gray"}
    />
  );
}
