'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { sendSMS, loginOrRegister, USE_MOCK } from '../api/blog'
import { useAuth } from '../context/AuthContext'
import Logo from './ui/Logo'
import type { User } from '../types/blog'

// 是否开放「短信验证码登录」。个人博客仅保留管理员密码登录，默认关闭。
const SMS_LOGIN_ENABLED = false

export default function Login() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [modeState, setModeState] = useState<'password' | 'code'>('password')
  const mode = SMS_LOGIN_ENABLED ? modeState : 'password'
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { setUser } = useAuth()
  const router = useRouter()

  const send = () => {
    if (!/^\d{6,20}$/.test(phone)) {
      alert('请输入正确的手机号')
      return
    }
    setSending(true)
    sendSMS(phone)
      .then(() => {
        alert('验证码已发送（开发环境请查看后端控制台日志）')
        let n = 60
        setCountdown(n)
        const t = setInterval(() => {
          n -= 1
          setCountdown(n)
          if (n <= 0) clearInterval(t)
        }, 1000)
      })
      .catch((e) => alert((e as { msg?: string }).msg || '发送失败'))
      .finally(() => setSending(false))
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!phone) {
      alert('请填写手机号')
      return
    }

    // 框架预览：mock 模式直接以管理员身份登录，无需后端
    if (USE_MOCK) {
      const mockUser: User = {
        id: 1,
        nickname: '行云流水',
        phone,
        role: 'admin',
      }
      setUser('mock-token', mockUser)
      router.push('/')
      return
    }

    let req
    if (mode === 'password') {
      if (!password) {
        alert('请填写密码')
        return
      }
      req = loginOrRegister(phone, '', password)
    } else {
      if (!code) {
        alert('请填写验证码')
        return
      }
      req = loginOrRegister(phone, code, '')
    }

    req
      .then((r) => {
        setUser(r.data.token, r.data.user)
        router.push('/')
      })
      .catch((e) => alert((e as { msg?: string }).msg || '登录失败'))
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-light/50 via-canvas to-canvas" />
      <div className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

      <div className="w-full max-w-[420px] rounded-2xl border border-ink-200/70 bg-white p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <Logo className="text-lg" />
        </div>
        <h1 className="text-center text-xl font-bold text-ink-900">管理后台登录</h1>
        <p className="mb-5 mt-1.5 text-center text-sm text-ink-400">登录行云流水，管理文章与评论</p>

        {SMS_LOGIN_ENABLED && (
          <div className="mb-6 flex border-b border-ink-200/70">
            {[
              { key: 'password', label: '密码登录' },
              { key: 'code', label: '验证码登录' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setModeState(t.key as 'password' | 'code')}
                className={`flex-1 border-b-2 pb-2.5 text-sm font-medium transition ${
                  mode === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-ink-400 hover:text-ink-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-ink-600">手机号</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="h-11 w-full rounded-lg border border-ink-200/80 px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="请输入手机号"
            />
          </div>

          {mode === 'password' ? (
            <div>
              <label className="mb-1.5 block text-xs text-ink-600">密码</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-ink-200/80 px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="请输入密码"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs text-ink-600">验证码</label>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="h-11 flex-1 rounded-lg border border-ink-200/80 px-3 font-mono tracking-widest outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="6 位验证码"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || countdown > 0}
                  className="h-11 whitespace-nowrap rounded-lg border border-primary/40 px-3 text-sm font-medium text-primary transition hover:bg-primary-light/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  {countdown > 0 ? `${countdown}s 重发` : '获取验证码'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary h-11 w-full">
            {mode === 'password' ? '登录' : '登录 / 注册'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-ink-400">
          登录即代表您同意行云流水的
          <a href="#" className="link-primary mx-1">
            服务条款
          </a>
          与
          <a href="#" className="link-primary mx-1">
            隐私政策
          </a>
        </p>
      </div>
    </div>
  )
}
