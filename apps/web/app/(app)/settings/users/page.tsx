export default function UsersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-gray-900 leading-tight">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Sample data</p>
        </div>
        <button className="rounded-md bg-[#C02B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] transition-colors">Invite user</button>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Email</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Role</th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { name: 'Jishan Ahmad', email: 'itzjishanahmad09@gmail.com', role: 'Admin' },
              { name: 'Anil Kumar', email: 'anil@primecasa.com', role: 'Agent' },
              { name: 'Meena Sharma', email: 'meena@primecasa.com', role: 'Agent' },
            ].map((u, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.role}</td>
                <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[11px] font-medium text-[#2E7D32]">Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}