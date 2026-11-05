import { BookingForm } from '@/components/bookings/BookingForm';

export default function NewBookingPage({
  searchParams,
}: {
  searchParams: { leadId?: string; projectId?: string };
}) {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-3 text-lg font-semibold">New booking</h1>
      <BookingForm
        defaultLeadId={searchParams.leadId}
        defaultProjectId={searchParams.projectId}
      />
    </div>
  );
}