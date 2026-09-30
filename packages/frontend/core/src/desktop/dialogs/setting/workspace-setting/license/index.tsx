import { Button } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
} from '@affine/component/setting-components';
import { SelfhostLicenseService } from '@affine/core/modules/cloud';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { SubscriptionVariant } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { FrameworkScope, useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import { EnableCloudPanel } from '../preference/enable-cloud';
import * as styles from './styles.css';
import { UploadLicenseModal } from './upload-license-modal';

export const WorkspaceSettingLicense = ({
  onCloseSetting,
}: {
  onCloseSetting: () => void;
}) => {
  const workspace = useService(WorkspaceService).workspace;

  const t = useI18n();

  if (workspace === null) {
    return null;
  }

  return (
    <FrameworkScope scope={workspace.scope}>
      <SettingHeader
        title={t['com.affine.settings.workspace.license']()}
        subtitle={t['com.affine.settings.workspace.license.description']()}
      />
      {workspace.flavour === 'local' ? (
        <EnableCloudPanel onCloseSetting={onCloseSetting} />
      ) : (
        <ReplaceLicenseModal />
      )}
    </FrameworkScope>
  );
};
const ReplaceLicenseModal = () => {
  const t = useI18n();
  const selfhostLicenseService = useService(SelfhostLicenseService);
  const license = useLiveData(selfhostLicenseService.license$);
  const isOneTimePurchase = license?.variant === SubscriptionVariant.Onetime;
  const permission = useService(WorkspacePermissionService).permission;
  const isTeam = useLiveData(permission.isTeam$);
  const [openUploadModal, setOpenUploadModal] = useState(false);

  const handleClick = useCallback(() => {
    setOpenUploadModal(true);
  }, []);

  useEffect(() => {
    selfhostLicenseService.revalidate();
  }, [selfhostLicenseService]);

  if (!isTeam || !isOneTimePurchase) {
    return null;
  }

  return (
    <>
      <SettingRow
        className={styles.paymentMethod}
        name={t[
          'com.affine.settings.workspace.license.self-host-team.replace-license.title'
        ]()}
        desc={t[
          'com.affine.settings.workspace.license.self-host-team.replace-license.description'
        ]()}
      >
        <Button onClick={handleClick}>
          {t[
            'com.affine.settings.workspace.license.self-host-team.replace-license.upload'
          ]()}
        </Button>
      </SettingRow>
      <UploadLicenseModal
        open={openUploadModal}
        onOpenChange={setOpenUploadModal}
      />
    </>
  );
};
