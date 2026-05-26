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
    CreateBuildingRequest,
    CreateFloorRequest,
    CreateSiteRequest,
    FloorResponse,
    SeatConfigurationResponse,
    SeatConfigurationUpdateRequest,
    SeatResponse,
    SiteDetailsResponse,
    SiteResponse,
    UpdateBuildingRequest,
    UpdateFloorRequest,
    UpdateSiteRequest,
)
from backend.services.location_service import (
    create_building,
    create_floor,
    create_site,
    get_buildings_by_site,
    get_floors_by_building,
    get_site_details,
    get_sites,
    update_building_metadata,
    update_floor_metadata,
    update_seat_configuration_metadata,
    update_site_metadata,
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

    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int | None, Query(ge=1, le=200)] = None,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = "ACTIVE",
) -> list[SiteResponse]:

    return get_sites(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        page=page,
        limit=limit,
        search=search,
        status_filter=status_filter,
    )


@router.post(
    "/sites",
    response_model=SiteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_site_route(
    payload: CreateSiteRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> SiteResponse:
    return create_site(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        payload=payload,
    )


@router.get("/sites/{site_id}", response_model=SiteDetailsResponse)
def site_details(
    site_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> SiteDetailsResponse:
    return get_site_details(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        site_id=str(site_id),
    )


@router.patch("/sites/{site_id}", response_model=SiteResponse)
def update_site_route(
    site_id: Annotated[int, Path(gt=0)],
    payload: UpdateSiteRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> SiteResponse:
    return update_site_metadata(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        site_id=str(site_id),
        payload=payload,
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

    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int | None, Query(ge=1, le=200)] = None,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = "ACTIVE",
) -> list[BuildingResponse]:

    return get_buildings_by_site(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        site_id=str(site_id),
        page=page,
        limit=limit,
        search=search,
        status_filter=status_filter,
    )


@router.post(
    "/buildings",
    response_model=BuildingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_building_route(
    payload: CreateBuildingRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> BuildingResponse:
    return create_building(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        payload=payload,
    )


@router.patch("/buildings/{building_id}", response_model=BuildingResponse)
def update_building_route(
    building_id: Annotated[int, Path(gt=0)],
    payload: UpdateBuildingRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> BuildingResponse:
    return update_building_metadata(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        building_id=str(building_id),
        payload=payload,
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

    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int | None, Query(ge=1, le=200)] = None,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> list[FloorResponse]:

    return get_floors_by_building(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        building_id=str(building_id),
        page=page,
        limit=limit,
        search=search,
        status_filter=status_filter,
    )


@router.get(
    "/offices/{office_id}/floors",
    response_model=list[FloorResponse],
)
def floors_by_office(
    office_id: Annotated[int, Path(gt=0)],

    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],

    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],

    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int | None, Query(ge=1, le=200)] = None,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> list[FloorResponse]:
    return get_floors_by_building(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        building_id=str(office_id),
        page=page,
        limit=limit,
        search=search,
        status_filter=status_filter,
    )


@router.post(
    "/floors",
    response_model=FloorResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_floor_route(
    payload: CreateFloorRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> FloorResponse:
    return create_floor(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        payload=payload,
    )


@router.patch("/floors/{floor_id}", response_model=FloorResponse)
def update_floor_route(
    floor_id: Annotated[int, Path(gt=0)],
    payload: UpdateFloorRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> FloorResponse:
    return update_floor_metadata(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        floor_id=str(floor_id),
        payload=payload,
    )


@router.patch(
    "/seats/{seat_id}/configuration",
    response_model=SeatConfigurationResponse,
)
def update_seat_configuration_route(
    seat_id: Annotated[int, Path(gt=0)],
    payload: SeatConfigurationUpdateRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> SeatConfigurationResponse:
    return update_seat_configuration_metadata(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        seat_id=str(seat_id),
        payload=payload,
    )


@router.get(
    "/floors/{floor_id}/seats",
    response_model=list[AvailableSeatResponse],
)
def available_seats(
    floor_id: Annotated[int, Path(gt=0)],
    start_date: date,
    end_date: date,

    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],

    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],

    booked_for_user_id: Annotated[
        int | None,
        Query(),
    ] = None,

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

    effective_user_id = (
        booked_for_user_id
        if booked_for_user_id is not None
        else current_user["user_id"]
    )

    return get_available_seats_by_range(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        floor_id=str(floor_id),
        start_date=start_date,
        end_date=end_date,
        current_user=current_user,
        booked_for_user_id=str(effective_user_id),
        amenity_ids=amenity_ids,
    )
