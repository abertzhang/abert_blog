import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendSMS, loginOrRegister } from '../api/blog'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/ui/Logo'

// 是否开放「短信验证码登录」。
//
// 这是个人博客，登录通道只保留管理员密码登录，因此默认关闭。
// 后端对应开关是 config.AllowSMSLogin（环境变量 ALLOW_SMS_LOGIN，默认 false），
// 两端必须一起改：只开前端会拿到 403，只开后端则页面上找不到入口。
const SMS_LOGIN_ENABLED = false

export default function Login() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  // 登录方式：password = 密码登录（本站唯一开放的方式）；code = 短信验证码登录
  const [modeState, setModeState] = useState('password')
  // 关闭短信登录时强制锁定为密码登录，避免残留状态渲染出验证码输入框
  const mode = SMS_LOGIN_ENABLED ? modeState : 'password'
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { setUser } = useAuth()
  const navigate = useNavigate()

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
      .catch((e) => alert(e.msg || '发送失败'))
      .finally(() => setSending(false))
  }

  const submit = (e) => {
    e?.preventDefault()
    if (!phone) {
      alert('请填写手机号')
      return
    }

    // 按当前登录方式组装请求：
    //   密码模式传 password（code 留空），验证码模式传 code（password 留空）
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
        navigate('/')
      })
      .catch((e) => alert(e.msg || '登录失败'))
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* 装饰背景 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-light/50 via-canvas to-canvas" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl -z-10" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl -z-10" />

      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-card border border-ink-200/70 p-8">
        <div className="flex justify-center mb-6">
          <Logo className="text-lg" />
        </div>
        <h1 className="text-center text-xl font-bold text-ink-900">管理后台登录</h1>
        <p className="text-center text-sm text-ink-400 mt-1.5 mb-5">
          登录一码平川，管理文章与评论
        </p>

        {/* 登录方式切换：只有一种方式时不渲染这组 tab（短信登录默认关闭） */}
        {SMS_LOGIN_ENABLED && (
          <div className="flex mb-6 border-b border-ink-200/70">
            {[
              { key: 'password', label: '密码登录' },
              { key: 'code', label: '验证码登录' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setModeState(t.key)}
                className={`flex-1 pb-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                  mode === t.key
                    ? 'text-primary border-primary'
                    : 'text-ink-400 border-transparent hover:text-ink-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-ink-600 mb-1.5">手机号</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="w-full h-11 px-3 border border-ink-200/80 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              placeholder="请输入手机号"
            />
          </div>

          {mode === 'password' ? (
            <div>
              <label className="block text-xs text-ink-600 mb-1.5">密码</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full h-11 px-3 border border-ink-200/80 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-ink-600 mb-1.5">验证码</label>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 h-11 px-3 border border-ink-200/80 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition font-mono tracking-widest"
                  placeholder="6 位验证码"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || countdown > 0}
                  className="h-11 px-3 text-sm font-medium text-primary border border-primary/40 rounded-lg hover:bg-primary-light/50 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap transition"
                >
                  {countdown > 0 ? `${countdown}s 重发` : '获取验证码'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary w-full h-11">
            {mode === 'password' ? '登录' : '登录 / 注册'}
          </button>
        </form>

        <p className="text-center text-xs text-ink-400 mt-6 leading-5">
          登录即代表您同意一码平川的
          <a href="#" className="link-primary mx-1">服务条款</a>
          与
          <a href="#" className="link-primary mx-1">隐私政策</a>
        </p>
      </div>
    </div>
  )
}
