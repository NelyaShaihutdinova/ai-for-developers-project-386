import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{
  title: "Calendar Booking API",
})
@server("http://localhost:3000", "Development server")
namespace CalendarApi;

model MeetingType {
  id: int32;
  name: string;
  description: string;
  durationMinutes: int32;
  isActive: boolean;
  createdAt: string;
}

model MeetingTypeCreate {
  name: string;
  description: string;
  durationMinutes: int32;
}

model MeetingTypeUpdate {
  name?: string;
  description?: string;
  durationMinutes?: int32;
}

model ErrorResponse {
  code: string;
  message: string;
}

model Error {
  error: ErrorResponse;
}

model NotFound {
  error: {
    code: "NOT_FOUND";
    message: "Meeting type not found";
  };
}

model Slot {
  startAt: string;
  endAt: string;
}

@route("/api/slots")
interface Slots {
  @get list(@query meetingTypeId: int32, @query date: string): Slot[] | NotFound;
}

@route("/api/meeting-types")
interface MeetingTypes {
  @get list(): MeetingType[];
  @get getById(@path id: int32): MeetingType | NotFound;
  @post create(...MeetingTypeCreate): MeetingType;
  @patch update(@path id: int32, ...MeetingTypeUpdate): MeetingType | NotFound;
  @post deactivate(@path id: int32): MeetingType | NotFound;
}

model BookingCreate {
  meetingTypeId: int32;
  startAt: string;
  guestName: string;
  guestEmail: string;
}

model Booking {
  id: int32;
  meetingTypeId: int32;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  createdAt: string;
}

@route("/api/bookings")
interface Bookings {
  @get list(): BookingWithTypeName[];
  @post create(...BookingCreate): CreateBookingResponse;
}

union CreateBookingResponse {
  CreatedResponse,
  ValidationErrorResponse,
  ConflictResponse,
}

model CreatedResponse {
  @statusCode status: 201;
  @body body: Booking;
}

model ValidationErrorResponse {
  @statusCode status: 400;
  @body body: Error;
}

model ConflictResponse {
  @statusCode status: 409;
  @body body: ConflictError;
}

model ConflictError {
  error: {
    code: "CONFLICT";
    message: "Slot is already booked";
  };
}

model BookingWithTypeName {
  id: int32;
  meetingTypeId: int32;
  meetingTypeName: string;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  createdAt: string;
}
