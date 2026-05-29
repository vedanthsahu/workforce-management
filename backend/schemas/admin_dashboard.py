"""
Schemas for admin dashboard analytics requests and responses.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AdminBookingStatus = Literal[
    "CONFIRMED",
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
]


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class AdminDashboardSummaryResponse(BaseModel):
    total_offices: int = 0
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


class AdminBookingListQuery(CamelModel):
    date: date
    site_id: int | None = Field(default=None, alias="siteId", gt=0)
    building_id: int | None = Field(default=None, alias="buildingId", gt=0)
    floor_id: int | None = Field(default=None, alias="floorId", gt=0)
    booking_status: AdminBookingStatus | None = Field(
        default=None,
        alias="bookingStatus",
    )
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=200)


class AdminOccupancyDateRangeQuery(CamelModel):
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    site_id: int | None = Field(default=None, alias="siteId", gt=0)
    building_id: int | None = Field(default=None, alias="buildingId", gt=0)
    floor_id: int | None = Field(default=None, alias="floorId", gt=0)


class AdminHierarchyOccupancyQuery(CamelModel):
    date: date
    site_id: int | None = Field(default=None, alias="siteId", gt=0)
    building_id: int | None = Field(default=None, alias="buildingId", gt=0)


class AdminBookingUserResponse(CamelModel):
    user_id: str | None = Field(default=None, alias="userId")
    email: str | None = None
    full_name: str | None = Field(default=None, alias="fullName")
    role_name: str | None = Field(default=None, alias="roleName")
    department: str | None = None
    job_title: str | None = Field(default=None, alias="jobTitle")


class AdminBookingSeatResponse(CamelModel):
    seat_id: str = Field(alias="seatId")
    seat_code: str | None = Field(default=None, alias="seatCode")
    seat_type: str | None = Field(default=None, alias="seatType")
    seat_neighborhood: str | None = Field(default=None, alias="seatNeighborhood")


class AdminBookingSiteResponse(CamelModel):
    site_id: str = Field(alias="siteId")
    site_code: str | None = Field(default=None, alias="siteCode")
    site_name: str | None = Field(default=None, alias="siteName")


class AdminBookingBuildingResponse(CamelModel):
    building_id: str = Field(alias="buildingId")
    building_code: str | None = Field(default=None, alias="buildingCode")
    building_name: str | None = Field(default=None, alias="buildingName")


class AdminBookingFloorResponse(CamelModel):
    floor_id: str = Field(alias="floorId")
    floor_code: str | None = Field(default=None, alias="floorCode")
    floor_name: str | None = Field(default=None, alias="floorName")


class AdminBookingListItemResponse(CamelModel):
    booking_id: str = Field(alias="bookingId")
    booking_date: date = Field(alias="bookingDate")
    booking_status: AdminBookingStatus = Field(alias="bookingStatus")
    source_channel: str | None = Field(default=None, alias="sourceChannel")
    user: AdminBookingUserResponse | None = None
    booked_for_user: AdminBookingUserResponse | None = Field(
        default=None,
        alias="bookedForUser",
    )
    seat: AdminBookingSeatResponse
    site: AdminBookingSiteResponse
    building: AdminBookingBuildingResponse
    floor: AdminBookingFloorResponse
    check_in_at: datetime | None = Field(default=None, alias="checkInAt")
    checked_out_at: datetime | None = Field(default=None, alias="checkedOutAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")


class AdminBookingListResponse(CamelModel):
    items: list[AdminBookingListItemResponse]
    page: int
    limit: int
    total: int
    total_pages: int = Field(alias="totalPages")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "bookingId": "1001",
                        "bookingDate": "2026-05-22",
                        "bookingStatus": "CONFIRMED",
                        "sourceChannel": "WEB",
                        "user": {
                            "userId": "42",
                            "email": "employee@example.com",
                            "fullName": "Employee One",
                            "roleName": "EMPLOYEE",
                        },
                        "bookedForUser": {
                            "userId": "42",
                            "email": "employee@example.com",
                            "fullName": "Employee One",
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
                ],
                "page": 1,
                "limit": 50,
                "total": 1,
                "totalPages": 1,
            }
        },
    )


class AdminDateOccupancyResponse(CamelModel):
    date: date
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
