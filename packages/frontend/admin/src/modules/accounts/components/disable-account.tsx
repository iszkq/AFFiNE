import { TypeConfirmDialog } from '../../../components/shared/type-confirm-dialog';

export const DisableAccountDialog = ({
  email,
  open,
  onClose,
  onDisable,
  onOpenChange,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
  onDisable: () => void;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <TypeConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="禁用账号？"
      description={
        <>
          <span className="font-bold">{email}</span>{' '}
          的数据将被删除，且无法再用于登录。此操作不可撤销，请谨慎操作。
        </>
      }
      targetText={email}
      inputPlaceholder="请输入邮箱确认"
      confirmText="禁用"
      confirmButtonVariant="destructive"
      onConfirm={onDisable}
      onClose={onClose}
    />
  );
};
