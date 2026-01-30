export default function ListPageLoader() {
  return (
    <div className="h-full relative animate-pulse  flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neutral-50"></div>
      <p className="text-neutral-50 text-xl mt-4">Loading notes</p>
    </div>
  );
}
