import CustomEmbed from '../structures/Embed'

export const Permission = {
  permissionFailed: () =>
    new CustomEmbed().setTitle('권한 부족').setColor('Red'),

  notOwner: () =>
    Permission.permissionFailed().setDescription(
      '봇 소유자만 사용할 수 있는 명령어입니다.',
    ),

  notAdmin: () =>
    Permission.permissionFailed().setDescription(
      '관리자만 사용할 수 있는 명령어입니다.',
    ),
}
