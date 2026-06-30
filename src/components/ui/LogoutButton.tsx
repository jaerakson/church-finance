'use client'

export default function LogoutButton() {
  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }
  return (
    <button
      onClick={logout}
      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-rose-500 transition-colors"
    >
      로그아웃
    </button>
  )
}
