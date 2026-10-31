import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ShipButton } from '@ship-ui/core/ship-button';
import { ShipSelect } from '@ship-ui/core/ship-select';
import { ShipFormField } from '@ship-ui/core/ship-form-field';
import { ShipIcon } from '@ship-ui/core/ship-icon';
import { ShipAlert } from '@ship-ui/core/ship-alert';
import { ShipSpinner } from '@ship-ui/core/ship-spinner';

export type NotificationServiceType =
  | 'none'
  | 'feishu'
  | 'wecom'
  | 'dingtalk'
  | 'telegram'
  | 'bark'
  | 'serverchan'
  | 'pushdeer'
  | 'webhook';

export type NotificationConfigDto = {
  Service: NotificationServiceType;
  Url: string;
  Secret: string;
  Level: string;
  CustomTitle: string;
};

@Component({
  selector: 'app-notification-settings',
  imports: [FormsModule, ShipButton, ShipSelect, ShipIcon, ShipAlert, ShipSpinner],
  templateUrl: './notification-settings.component.html',
  styleUrl: './notification-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSettingsComponent implements OnInit {
  #http = inject(HttpClient);

  service = signal<NotificationServiceType>('none');
  url = signal('');
  secret = signal('');
  level = signal('all');
  customTitle = signal('');

  isLoading = signal(true);
  isSaving = signal(false);
  isTesting = signal(false);
  testResult = signal<{ success: boolean; message: string } | null>(null);
  saveSuccess = signal(false);

  serviceOptions = signal([
    { value: 'none', label: $localize`关闭通知 (不发送)` },
    { value: 'feishu', label: $localize`飞书机器人 (Feishu)` },
    { value: 'wecom', label: $localize`企业微信机器人 (WeCom)` },
    { value: 'dingtalk', label: $localize`钉钉机器人 (DingTalk)` },
    { value: 'telegram', label: $localize`Telegram 机器人` },
    { value: 'bark', label: $localize`Bark (iOS)` },
    { value: 'serverchan', label: $localize`Server酱 (Turbo)` },
    { value: 'pushdeer', label: $localize`PushDeer` },
    { value: 'webhook', label: $localize`自定义 Webhook` },
  ]);

  levelOptions = signal([
    { value: 'all', label: $localize`所有任务完成均通知 (成功、警告、失败)` },
    { value: 'warning_error', label: $localize`仅当存在警告或错误时通知` },
    { value: 'error_only', label: $localize`仅当任务发生错误失败时通知` },
  ]);

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.isLoading.set(true);
    this.#http.get<NotificationConfigDto>('/api/v1/notification/config').subscribe({
      next: (cfg) => {
        if (cfg) {
          this.service.set((cfg.Service || 'none') as NotificationServiceType);
          this.url.set(cfg.Url || '');
          this.secret.set(cfg.Secret || '');
          this.level.set(cfg.Level || 'all');
          this.customTitle.set(cfg.CustomTitle || '');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  updateService(val: string) {
    this.service.set(val as NotificationServiceType);
    this.testResult.set(null);
    this.saveSuccess.set(false);
  }

  updateLevel(val: string) {
    this.level.set(val);
    this.saveSuccess.set(false);
  }

  getCurrentPayload(): NotificationConfigDto {
    return {
      Service: this.service(),
      Url: this.url(),
      Secret: this.secret(),
      Level: this.level(),
      CustomTitle: this.customTitle(),
    };
  }

  testNotification() {
    this.isTesting.set(true);
    this.testResult.set(null);
    this.saveSuccess.set(false);

    this.#http
      .post<{ Success: boolean; Message: string }>('/api/v1/notification/test', this.getCurrentPayload())
      .subscribe({
        next: (res) => {
          this.isTesting.set(false);
          this.testResult.set({
            success: res.Success,
            message: res.Message,
          });
        },
        error: (err) => {
          this.isTesting.set(false);
          this.testResult.set({
            success: false,
            message: err?.error?.Message || err?.message || '测试请求发送失败',
          });
        },
      });
  }

  saveConfig() {
    this.isSaving.set(true);
    this.saveSuccess.set(false);

    this.#http.post('/api/v1/notification/config', this.getCurrentPayload()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.testResult.set({
          success: false,
          message: '保存配置失败: ' + (err?.message || '未知错误'),
        });
      },
    });
  }
}
