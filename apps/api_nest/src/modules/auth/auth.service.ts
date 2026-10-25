/**
 * 认证服务（对应 api_express/routes/authRouter.js）
 * 密码在数据库内用 pgcrypto 的 crypt() 生成 bcrypt 哈希，Node 侧无需安装 bcrypt。
 */
import { Injectable, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { sign } from '../../common/token.js';

const PHONE_RE = /^1[3-9]\d{9}$/;

export interface PublicUser {
  id: number;
  nickname: string;
  phone: string;
  role: string;
}

@Injectable()
export class AuthService {
  // 内存版短信验证码存储（开发期；生产应替换为 Redis 等持久化 + 真实短信网关）
  private readonly smsCodes = new Map<string, { code: string; exp: number }>();
  private readonly SMS_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly db: DatabaseService) {}

  toPublicUser(row: { id: number; nickname: string; phone: string; role: string }): PublicUser {
    return {
      id: Number(row.id),
      nickname: row.nickname,
      phone: row.phone,
      role: row.role,
    };
  }

  async register(phone?: string, password?: string, nickname?: string): Promise<{ token: string; user: PublicUser }> {
    if (!phone || !PHONE_RE.test(phone)) {
      throw new BadRequestException('请输入合法的手机号');
    }
    if (!password || String(password).length < 6) {
      throw new BadRequestException('密码至少 6 位');
    }
    const exist = await this.db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (exist.rows.length > 0) {
      throw new ConflictException('该手机号已注册');
    }
    const name = (nickname && String(nickname).trim()) || phone;
    const { rows } = await this.db.query<{ id: number; nickname: string; phone: string; role: string }>(
      `INSERT INTO users (phone, nickname, password, role)
       VALUES ($1, $2, crypt($3, gen_salt('bf')), 'user')
       RETURNING id, nickname, phone, role`,
      [phone, name, password],
    );
    const user = rows[0];
    const token = sign({ uid: Number(user.id), role: user.role });
    return { token, user: this.toPublicUser(user) };
  }

  sendSms(phone?: string): void {
    if (!phone || !PHONE_RE.test(phone)) {
      throw new BadRequestException('请输入合法的手机号');
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.smsCodes.set(phone, { code, exp: Date.now() + this.SMS_TTL_MS });
    // 开发环境把验证码打印到控制台，方便联调（生产环境应替换为真实短信发送）
    console.log(`[sms] 向 ${phone} 发送验证码：${code}（开发环境打印，未真实发送）`);
  }

  async login(phone?: string, password?: string, code?: string): Promise<{ token: string; user: PublicUser }> {
    if (!phone || !PHONE_RE.test(phone)) {
      throw new BadRequestException('请输入合法的手机号');
    }
    // 路径一：密码登录（当前启用）
    if (password) {
      const { rows } = await this.db.query<{ id: number; nickname: string; phone: string; role: string }>(
        `SELECT id, nickname, phone, role
           FROM users
          WHERE phone = $1
            AND password = crypt($2, password)`,
        [phone, password],
      );
      if (rows.length === 0) {
        throw new UnauthorizedException('手机号或密码错误');
      }
      const user = rows[0];
      const token = sign({ uid: Number(user.id), role: user.role });
      return { token, user: this.toPublicUser(user) };
    }
    // 路径二：短信验证码登录（备用）
    if (code) {
      const rec = this.smsCodes.get(phone);
      if (!rec || rec.exp < Date.now()) {
        throw new BadRequestException('验证码已过期，请重新获取');
      }
      if (rec.code !== String(code)) {
        throw new BadRequestException('验证码错误');
      }
      this.smsCodes.delete(phone);
      const { rows } = await this.db.query<{ id: number; nickname: string; phone: string; role: string }>(
        'SELECT id, nickname, phone, role FROM users WHERE phone = $1',
        [phone],
      );
      if (rows.length === 0) {
        throw new UnauthorizedException('该手机号尚未注册');
      }
      const user = rows[0];
      const token = sign({ uid: Number(user.id), role: user.role });
      return { token, user: this.toPublicUser(user) };
    }
    throw new BadRequestException('请提供密码或短信验证码');
  }

  async me(userId: number): Promise<PublicUser> {
    const { rows } = await this.db.query<{ id: number; nickname: string; phone: string; role: string }>(
      'SELECT id, nickname, phone, role FROM users WHERE id = $1',
      [userId],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('用户不存在或登录已失效');
    }
    return this.toPublicUser(rows[0]);
  }
}
