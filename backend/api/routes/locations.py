"""HTTP routes for authenticated location and seat discovery."""

from __future__ import annotations

from datetime import date
from typing import Any, Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    status,
)

from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db

from backend.schemas.booking import AvailableSeatResponse

from backend.schemas.location import (
    BuildingResponse,
    FloorResponse,
    SeatResponse,
    SiteResponse,
)
from backend.services.location_service import (
    get_buildings_by_site,
    get_floors_by_building,
    get_sites,
)

from backend.services.booking_service import (
    get_available_seats_by_range,
)

router = APIRouter(tags=["locations"])


@router.get("/sites", response_model=list[SiteResponse])
def sites(
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> list[SiteResponse]:

    return get_sites(
        conn,
        tenant_id=str(current_user["tenant_id"]),
    )


@router.get("/buildings", response_model=list[BuildingResponse])
def buildings(
    site_id: Annotated[int, Query(gt=0)],

    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],

    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],

) -> list[BuildingResponse]:

    return get_buildings_by_site(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        site_id=str(site_id),
    )


@router.get(
    "/buildings/{building_id}/floors",
    response_model=list[FloorResponse],
)
def floors_by_building(
    building_id: Annotated[int, Path(gt=0)],

    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],

    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],

) -> list[FloorResponse]:

    return get_floors_by_building(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        building_id=str(building_id),
    )


@router.get(
    "/floors/{floor_id}/seats",
    response_model=list[AvailableSeatResponse],
)
def available_seats(
    floor_id: Annotated[int, Path(gt=0)],

    start_date: date,
    end_date: date,
    booked_for_user_id: Annotated[int, Query(gt=0)],

    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],

    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],

    amenity_ids: Annotated[
        list[int] | None,
        Query(),
    ] = None,

) -> list[AvailableSeatResponse]:

    if start_date > end_date:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_date_range",
                "message": "start_date must be earlier than end_date.",
            },
        )

    if (end_date - start_date).days > 31:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "date_range_too_large",
                "message": "Maximum allowed range is 31 days.",
            },
        )

    return get_available_seats_by_range(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        floor_id=str(floor_id),
        start_date=start_date,
        end_date=end_date,
        current_user=current_user,
        booked_for_user_id=str(booked_for_user_id),
        amenity_ids=amenity_ids,
    )


