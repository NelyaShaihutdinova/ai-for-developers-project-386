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

model Error {
  error: {
    code: string;
    message: string;
  };
}

@route("/api/meeting-types")
interface MeetingTypes {
  list(): MeetingType[];
}
