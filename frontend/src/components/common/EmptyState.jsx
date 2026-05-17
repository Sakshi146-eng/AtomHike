import { InboxIcon } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", desc = "", action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <InboxIcon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-slate-700 font-semibold mb-1">{title}</h3>
      {desc && <p className="text-slate-400 text-sm mb-4">{desc}</p>}
      {action}
    </div>
  );
}
