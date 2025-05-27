export default function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex justify-center items-center w-full h-full">
      <p className="text-neutral-300 text-lg font-semibold">{message}</p>
    </div>
  )
}
