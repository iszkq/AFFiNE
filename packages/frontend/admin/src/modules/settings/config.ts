import { upperFirst } from 'lodash-es';
import type { ComponentType } from 'react';

import CONFIG_DESCRIPTORS from '../../config.json';
import type { ConfigInputProps } from './config-input-row';
import { AuthSigningKeys } from './operations/auth-signing-keys';
import { SendTestEmail } from './operations/send-test-email';
export type ConfigType = 'String' | 'Number' | 'Boolean' | 'JSON' | 'Enum';

type ConfigDescriptor = {
  desc: string;
  type: ConfigType;
  env?: string;
  link?: string;
};

export type AppConfig = Record<string, Record<string, any>>;

type AppConfigDescriptors = typeof CONFIG_DESCRIPTORS;
type AppConfigModule = keyof AppConfigDescriptors;
type ModuleConfigDescriptors<M extends AppConfigModule> =
  AppConfigDescriptors[M];
type ConfigGroup<T extends AppConfigModule> = {
  name: string;
  module: T;
  fields: Array<
    | keyof ModuleConfigDescriptors<T>
    | ({
        key: keyof ModuleConfigDescriptors<T>;
        sub?: string;
        desc?: string;
      } & Partial<ConfigInputProps>)
  >;
  operations?: ComponentType<{
    appConfig: AppConfig;
  }>[];
};
const IGNORED_MODULES: (keyof AppConfig)[] = [];

if (environment.isSelfHosted) {
  IGNORED_MODULES.push('payment', 'captcha', 'telemetry', 'metrics');
}

const ALL_CONFIGURABLE_MODULES = Object.keys(CONFIG_DESCRIPTORS).filter(
  key => !IGNORED_MODULES.includes(key as keyof AppConfig)
);

export const KNOWN_CONFIG_GROUPS = [
  {
    name: '服务器',
    module: 'server',
    fields: ['externalUrl', 'name', 'hosts'],
  } as ConfigGroup<'server'>,
  {
    name: '账号与登录',
    module: 'auth',
    fields: [
      'allowSignup',
      'allowSignupForOauth',
      {
        key: 'newAccountActionDelay',
        type: 'Number',
        desc: '账号创建后，允许邀请成员、创建邀请链接或发布文档前需要等待的秒数。设为 0 可关闭限制。',
      },
      // nested json object
      {
        key: 'passwordRequirements',
        sub: 'min',
        type: 'Number',
        desc: '密码最小长度',
      },
      {
        key: 'passwordRequirements',
        sub: 'max',
        type: 'Number',
        desc: '密码最大长度',
      },
    ],
    operations: [AuthSigningKeys],
  } as ConfigGroup<'auth'>,
  {
    name: '邮件通知',
    module: 'mailer',
    fields: [
      'SMTP.name',
      'SMTP.host',
      'SMTP.port',
      'SMTP.username',
      'SMTP.password',
      'SMTP.ignoreTLS',
      'SMTP.sender',
    ],
    operations: [SendTestEmail],
  } as ConfigGroup<'mailer'>,
  {
    name: '存储',
    module: 'storages',
    fields: [
      {
        key: 'blob.storage',
        desc: '用户上传文件的完整存储配置，可设置本地目录或对象存储。',
        type: 'JSON',
      },
      {
        key: 'avatar.storage',
        desc: '用户头像的完整存储配置，可设置本地目录或对象存储。',
        type: 'JSON',
      },
      {
        key: 'avatar.publicPath',
        type: 'String',
        desc: '用户头像的公开访问地址前缀，例如 https://my-bucket.s3.amazonaws.com/。',
      },
    ],
  } as ConfigGroup<'storages'>,
  {
    name: '第三方登录',
    module: 'oauth',
    fields: ['providers.google', 'providers.github', 'providers.oidc'],
  } as ConfigGroup<'oauth'>,
  {
    name: 'AI 自带密钥',
    module: 'copilot',
    fields: [
      {
        key: 'enabled',
        desc: '启用 AI 功能。工作区所有者可在“工作区设置 → 集成 → AI 自带密钥”中配置服务商密钥。',
      },
      'byok.enabled',
      'byok.allowedProviders',
      'byok.allowCustomEndpoint',
      {
        key: 'byok.allowPrivateEndpoint',
        desc: '允许工作区所有者和管理员连接内网地址的 BYOK 服务商。仅对可信工作区启用。',
      },
    ],
  } as ConfigGroup<'copilot'>,
  {
    name: '搜索索引',
    module: 'indexer',
    fields: [
      {
        key: 'provider.type',
        type: 'Enum',
        options: ['embedded', 'elasticsearch', 'manticoresearch'],
        desc: '搜索服务商。内置搜索和 Elasticsearch 支持完整搜索语义，Manticore Search 提供基础搜索能力。',
      },
      'provider.endpoint',
      'provider.apiKey',
      'provider.username',
      'provider.password',
    ],
  } as ConfigGroup<'indexer'>,
];

export const UNKNOWN_CONFIG_GROUPS = ALL_CONFIGURABLE_MODULES.filter(
  module => !KNOWN_CONFIG_GROUPS.some(group => group.module === module)
).map(module => ({
  name: upperFirst(module),
  module,
  // @ts-expect-error allow
  fields: Object.keys(CONFIG_DESCRIPTORS[module]),
  operations: undefined,
}));

export const ALL_SETTING_GROUPS = [
  ...KNOWN_CONFIG_GROUPS,
  ...UNKNOWN_CONFIG_GROUPS,
];

export const ALL_CONFIG_DESCRIPTORS = CONFIG_DESCRIPTORS as Record<
  string,
  Record<string, ConfigDescriptor>
>;
