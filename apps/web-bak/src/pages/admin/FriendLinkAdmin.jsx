import { useEffect, useState } from 'react'
import {
  adminListFriendLinks,
  createFriendLink,
  updateFriendLink,
  deleteFriendLink,
} from '../../api/blog'
import SectionHeader from '../../components/ui/SectionHeader'

const emptyForm = { name: '', url: '', desc: '', sort: 0, status: 'enabled' }

export default function FriendLinkAdmin() {
  const [links, setLinks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)

  const load = () => {
    adminListFriendLinks().then((r) => setLinks(r.data || [])).catch(() => {})
  }
  useEffect(load, [])

  const add = () => {
    if (!form.name.trim() || !form.url.trim()) {
      alert('名称和链接地址必填')
      return
    }
    createFriendLink(form)
      .then(() => { setForm(emptyForm); load() })
      .catch((e) => alert(e.msg || '添加失败'))
  }

  const startEdit = (l) => {
    setEditingId(l.id)
    setEditForm({ name: l.name, url: l.url, desc: l.desc, sort: l.sort, status: l.status })
  }
  const saveEdit = (id) => {
    updateFriendLink(id, editForm)
      .then(() => { setEditingId(null); load() })
      .catch((e) => alert(e.msg || '保存失败'))
  }
  const toggleStatus = (l) => {
    updateFriendLink(l.id, { status: l.status === 'enabled' ? 'disabled' : 'enabled' })
      .then(load)
      .catch((e) => alert(e.msg || '操作失败'))
  }
  const remove = (id) => {
    if (!confirm('确认删除该友情链接？')) return
    deleteFriendLink(id).then(load).catch((e) => alert(e.msg || '删除失败'))
  }

  const field = (key, placeholder, value, onChange, extra = '') => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-9 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary ${extra}`}
    />
  )

  return (
    <div className="space-y-6">
      <SectionHeader title="友情链接管理" sub="Friend Links" />

      {/* 新增 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-ink-900 mb-3">添加友情链接</h3>
        <div className="flex flex-wrap items-end gap-3">
          {field('name', '名称（如 掘金）', form.name, (v) => setForm({ ...form, name: v }), 'w-40')}
          {field('url', '链接地址 https://...', form.url, (v) => setForm({ ...form, url: v }), 'flex-1 min-w-[220px]')}
          {field('desc', '简介', form.desc, (v) => setForm({ ...form, desc: v }), 'w-40')}
          {field('sort', '排序', String(form.sort), (v) => setForm({ ...form, sort: Number(v) || 0 }), 'w-20')}
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="h-9 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary bg-white"
          >
            <option value="enabled">启用</option>
            <option value="disabled">禁用</option>
          </select>
          <button onClick={add} className="btn-primary">添加</button>
        </div>
      </div>

      {/* 列表 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-ink-900 mb-3">全部友链（{links.length}）</h3>
        {links.length === 0 ? (
          <div className="text-sm text-ink-400 text-center py-8">暂无友链，先在上方添加一条吧。</div>
        ) : (
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.id} className="py-2.5 border-b border-ink-200/60 last:border-b-0">
                {editingId === l.id ? (
                  <div className="flex flex-wrap items-end gap-2">
                    {field('name', '名称', editForm.name, (v) => setEditForm({ ...editForm, name: v }), 'w-36')}
                    {field('url', '链接', editForm.url, (v) => setEditForm({ ...editForm, url: v }), 'flex-1 min-w-[200px]')}
                    {field('desc', '简介', editForm.desc, (v) => setEditForm({ ...editForm, desc: v }), 'w-32')}
                    {field('sort', '排序', String(editForm.sort), (v) => setEditForm({ ...editForm, sort: Number(v) || 0 }), 'w-16')}
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="h-9 px-2 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary bg-white"
                    >
                      <option value="enabled">启用</option>
                      <option value="disabled">禁用</option>
                    </select>
                    <button onClick={() => saveEdit(l.id)} className="text-primary text-sm hover:underline">保存</button>
                    <button onClick={() => setEditingId(null)} className="text-ink-400 text-sm hover:underline">取消</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-ink-900 font-medium w-28 truncate">{l.name}</span>
                    <a href={l.url} target="_blank" rel="noopener noreferrer"
                       className="text-ink-500 text-sm flex-1 truncate hover:text-primary hover:underline">
                      {l.url}
                    </a>
                    <span className="text-xs text-ink-400 hidden sm:inline w-24 truncate">{l.desc}</span>
                    <span className="text-xs text-ink-400 w-10 text-center">#{l.sort}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'enabled' ? 'bg-emerald-50 text-emerald-600' : 'bg-ink-100 text-ink-400'}`}>
                      {l.status === 'enabled' ? '启用' : '禁用'}
                    </span>
                    <button onClick={() => toggleStatus(l)} className="text-primary text-sm hover:underline ml-1">
                      {l.status === 'enabled' ? '停用' : '启用'}
                    </button>
                    <button onClick={() => startEdit(l)} className="text-primary text-sm hover:underline">编辑</button>
                    <button onClick={() => remove(l.id)} className="text-error text-sm hover:underline">删除</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
