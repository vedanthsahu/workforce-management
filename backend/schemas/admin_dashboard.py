"""
Schemas for admin dashboard analytics requests and responses.
"""

from __future__ import annotations

from datetime import date as Date
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.schemas.pagination import PaginationMetadata

ActivityStatus = Literal[
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "COMPLETED",
    "CANCELLED",
    "MODIFIED",
    "NO_SHOW",
    "SCHEDULED",
]

ActivityType = Literal[
    "EMPLOYEE_BOOKING",
    "GUEST_VISIT",
    "GUEST_BOOKING",
]

ActivityEntityType = Literal["EMPLOYEE", "GUEST"]

class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class AdminDashboardSummaryResponse(BaseModel):
    total_offices: int = 0
    total_buildings : int = 0
    total_floors: int = 0
    total_seats: int = 0

    booked_today: int = 0
    blocked_seats: int = 0
    booked_seats_today: int = 0
    blocked_seats_today: int = 0

    occupancy_percentage: float = 0.0

    total_bookings: int = 0
    unique_users_booked: int = 0
    booking_utilization_percentage: float = 0.0

    active_sites: int = 0
    inactive_sites: int = 0
    active_buildings: int = 0
    inactive_buildings: int = 0
    active_floors: int = 0
    inactive_floors: int = 0
    active_seats: int = 0
    inactive_seats: int = 0


class AdminActivityListQuery(CamelModel):
    date: Date | None = None
    site_id: int | None = Field(default=None, alias="siteId", gt=0)
    building_id: int | None = Field(default=None, alias="buildingId", gt=0)
    floor_id: int | None = Field(default=None, alias="floorId", gt=0)




class AdminOccupancyDateRangeQuery(CamelModel):
    start_date: Date = Field(alias="startDate")
    end_date: Date = Field(alias="endDate")
    site_id: int | None = Field(default=None, alias="siteId", gt=0)
    building_id: int | None = Field(default=None, alias="buildingId", gt=0)
    floor_id: int | None = Field(default=None, alias="floorId", gt=0)


class AdminHierarchyOccupancyQuery(CamelModel):
    date: Date
    site_id: int | None = Field(default=None, alias="siteId", gt=0)
    building_id: int | None = Field(default=None, alias="buildingId", gt=0)



class AdminActivitySeatResponse(CamelModel):
    seat_id: str | None = Field(default=None, alias="seatId")
    seat_code: str | None = Field(default=None, alias="seatCode")
    seat_type: str | None = Field(default=None, alias="seatType")
    seat_neighborhood: str | None = Field(default=None, alias="seatNeighborhood")


class AdminActivitySiteResponse(CamelModel):
    site_id: str | None = Field(default=None, alias="siteId")
    site_code: str | None = Field(default=None, alias="siteCode")
    site_name: str | None = Field(default=None, alias="siteName")


class AdminActivityBuildingResponse(CamelModel):
    building_id: str | None = Field(default=None, alias="buildingId")
    building_code: str | None = Field(default=None, alias="buildingCode")
    building_name: str | None = Field(default=None, alias="buildingName")


class AdminActivityFloorResponse(CamelModel):
    floor_id: str | None = Field(default=None, alias="floorId")
    floor_code: str | None = Field(default=None, alias="floorCode")
    floor_name: str | None = Field(default=None, alias="floorName")


class AdminDateOccupancyResponse(CamelModel):
    date: Date
    total_seats: int = Field(alias="totalSeats")
    blocked_seats: int = Field(alias="blockedSeats")
    available_seats: int = Field(alias="availableSeats")
    booked_seats: int = Field(alias="bookedSeats")
    occupancy_rate: float = Field(alias="occupancyRate")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "date": "2026-05-12",
                "totalSeats": 100,
                "blockedSeats": 5,
                "availableSeats": 95,
                "bookedSeats": 72,
                "occupancyRate": 75.79,
            }
        },
    )

class AdminHierarchyOccupancyResponse(CamelModel):
    site_id: str | None = Field(default=None, alias="siteId")
    site_name: str | None = Field(default=None, alias="siteName")
    building_id: str | None = Field(default=None, alias="buildingId")
    building_name: str | None = Field(default=None, alias="buildingName")
    floor_id: str | None = Field(default=None, alias="floorId")
    floor_name: str | None = Field(default=None, alias="floorName")
    total_seats: int = Field(alias="totalSeats")
    blocked_seats: int = Field(alias="blockedSeats")
    available_seats: int = Field(alias="availableSeats")
    booked_seats: int = Field(alias="bookedSeats")
    occupancy_rate: float = Field(alias="occupancyRate")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "siteId": "1",
                    "siteName": "Site A",
                    "totalSeats": 500,
                    "blockedSeats": 20,
                    "availableSeats": 480,
                    "bookedSeats": 350,
                    "occupancyRate": 72.91,
                },
                {
                    "buildingId": "11",
                    "buildingName": "Tower A",
                    "totalSeats": 200,
                    "blockedSeats": 10,
                    "availableSeats": 190,
                    "bookedSeats": 120,
                    "occupancyRate": 63.15,
                },
                {
                    "floorId": "101",
                    "floorName": "Floor 1",
                    "totalSeats": 80,
                    "blockedSeats": 5,
                    "availableSeats": 75,
                    "bookedSeats": 61,
                    "occupancyRate": 81.33,
                },
            ]
        },
    )

class AdminActivityPersonResponse(CamelModel):
    entity_type: ActivityEntityType | None = Field(default=None, alias="entityType")

    id: str | None = Field(default=None, alias="id")

    name: str | None = None

    email: str | None = None

    role: str | None = None

    department: str | None = None

    job_title: str | None = Field(
        default=None,
        alias="jobTitle",
    )

    guest_type: str | None = Field(
        default=None,
        alias="guestType",
    )


class AdminActivityListItemResponse(CamelModel):
    activity_id: str = Field(alias="activityId")

    activity_type: ActivityType = Field(
        alias="activityType",
    )

    has_booking: bool = Field(
        alias="hasBooking",
    )

    activity_status: ActivityStatus = Field(
        alias="activityStatus",
    )

    activity_date: Date = Field(
        alias="activityDate",
    )

    booking_id: str | None = Field(
        default=None,
        alias="bookingId",
    )

    guest_visit_id: str | None = Field(
        default=None,
        alias="guestVisitId",
    )

    booked_by: AdminActivityPersonResponse = Field(
        alias="bookedBy",
    )

    booked_for: AdminActivityPersonResponse = Field(
        alias="bookedFor",
    )

    seat: AdminActivitySeatResponse | None = None

    site: AdminActivitySiteResponse

    building: AdminActivityBuildingResponse

    floor: AdminActivityFloorResponse | None = None

    check_in_at: datetime | None = Field(
        default=None,
        alias="checkInAt",
    )

    checked_out_at: datetime | None = Field(
        default=None,
        alias="checkedOutAt",
    )

    created_at: datetime | None = Field(
        default=None,
        alias="createdAt",
    )


class AdminActivityListResponse(CamelModel):
    items: list[AdminActivityListItemResponse]
    pagination: PaginationMetadata | None = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "activityId": "booking-1001",
                        "activityType": "EMPLOYEE_BOOKING",
                        "activityStatus": "CONFIRMED",
                        "activityDate": "2026-05-22",
                        "bookingId": "1001",
                        "guestVisitId": None,
                        "hasBooking": True,
                        "bookedBy": {
                            "entityType": "EMPLOYEE",
                            "id": "42",
                            "name": "Employee One",
                            "email": "employee@example.com",
                            "role": "EMPLOYEE",
                        },
                        "bookedFor": {
                            "entityType": "EMPLOYEE",
                            "id": "42",
                            "name": "Employee One",
                            "email": "employee@example.com",
                            "role": "EMPLOYEE",
                        },
                        "seat": {
                            "seatId": "501",
                            "seatCode": "A-101",
                            "seatType": "STANDARD",
                        },
                        "site": {
                            "siteId": "1",
                            "siteCode": "BLR",
                            "siteName": "Bangalore Campus",
                        },
                        "building": {
                            "buildingId": "11",
                            "buildingCode": "TWA",
                            "buildingName": "Tower A",
                        },
                        "floor": {
                            "floorId": "101",
                            "floorCode": "F1",
                            "floorName": "Floor 1",
                        },
                        "checkInAt": None,
                        "checkedOutAt": None,
                        "createdAt": "2026-05-22T08:30:00Z",
                    }
                ]
            }
        },
    )
 