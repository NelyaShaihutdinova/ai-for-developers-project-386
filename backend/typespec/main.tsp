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

@route("/api/meeting-types")
interface MeetingTypes {
  @get list(): MeetingType[];
  @get getById(@path id: int32): MeetingType | NotFound;
  create(body: MeetingTypeCreate): MeetingType;
  @patch update(@path id: int32, body: MeetingTypeUpdate): MeetingType | NotFound;
  @post deactivate(@path id: int32): MeetingType | NotFound;
}
