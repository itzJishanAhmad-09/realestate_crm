import { BookingForm } from '@/components/bookings/BookingForm';
export default function NewBookingPage() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-3 text-lg font-semibold">New booking</h1>
      <BookingForm />
    </div>
  );
}
