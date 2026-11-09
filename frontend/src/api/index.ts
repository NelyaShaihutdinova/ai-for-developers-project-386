import { createClient, createConfig } from './generated/client'
import type { ClientOptions } from './generated/types.gen'

export const apiClient = createClient(createConfig<ClientOptions>({ baseUrl: '' }))

export {
  bookingsCreate,
  bookingsList,
  meetingTypesCreate,
  meetingTypesDeactivate,
  meetingTypesGetById,
  meetingTypesList,
  meetingTypesUpdate,
  slotsList,
} from './generated'

export type {
  Booking,
  BookingCreate,
  BookingWithTypeName,
  ErrorResponse,
  MeetingType,
  MeetingTypeCreate,
  MeetingTypeUpdate,
  Slot,
} from './generated'
