import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../utils/logger.service';
import { ConfigService } from '@nestjs/config';

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

@Injectable()
export class ProxyService {
  private proxies: ProxyConfig[] = [];
  private currentProxyIndex = 0;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.initializeProxies();
  }

  private initializeProxies(): void {
    // 설정에서 프록시 정보 로드
    const proxyHosts = this.configService.get<string>('PROXY_HOSTS', '');
    const proxyPorts = this.configService.get<string>('PROXY_PORTS', '');
    const proxyUsernames = this.configService.get<string>('PROXY_USERNAMES', '');
    const proxyPasswords = this.configService.get<string>('PROXY_PASSWORDS', '');

    if (!proxyHosts) {
      this.logger.warn('No proxies configured');
      return;
    }

    const hosts = proxyHosts.split(',');
    const ports = proxyPorts.split(',').map(port => parseInt(port.trim(), 10));
    const usernames = proxyUsernames ? proxyUsernames.split(',') : [];
    const passwords = proxyPasswords ? proxyPasswords.split(',') : [];

    for (let i = 0; i < hosts.length; i++) {
      const proxy: ProxyConfig = {
        host: hosts[i].trim(),
        port: ports[i] || 80,
      };

      if (usernames[i]) {
        proxy.username = usernames[i].trim();
      }

      if (passwords[i]) {
        proxy.password = passwords[i].trim();
      }

      this.proxies.push(proxy);
    }

    this.logger.log(`Initialized ${this.proxies.length} proxies`);
  }

  getNextProxy(): ProxyConfig | null {
    if (this.proxies.length === 0) {
      return null;
    }

    const proxy = this.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  getProxyUrl(proxy: ProxyConfig): string {
    if (proxy.username && proxy.password) {
      return `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    }
    return `http://${proxy.host}:${proxy.port}`;
  }

  markProxyAsFailed(proxy: ProxyConfig): void {
    // 실패한 프록시를 처리하는 로직
    // 예: 일정 시간 동안 사용하지 않거나, 실패 카운트를 증가시킴
    this.logger.warn(`Proxy ${proxy.host}:${proxy.port} marked as failed`);
  }

  getProxiesCount(): number {
    return this.proxies.length;
  }

  getActiveProxies(): ProxyConfig[] {
    return [...this.proxies];
  }
}
