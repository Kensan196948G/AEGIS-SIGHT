"""Unit tests for ip_management and network_device Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.models.ip_management import AssignmentStatus, AssignmentType
from app.models.network_device import NetworkDeviceType
from app.schemas.ip_management import (
    IPAssignmentCreate,
    IPConflict,
    IPRangeCreate,
    IPRangeUtilization,
    TopologyEdge,
    TopologyNode,
    TopologyResponse,
)
from app.schemas.network_device import (
    NetworkDeviceLinkRequest,
    NetworkScanEntry as NetworkDeviceScanEntry,
    NetworkScanRequest,
    NetworkScanResponse,
)


# ---------------------------------------------------------------------------
# IPRangeCreate
# ---------------------------------------------------------------------------


class TestIPRangeCreate:
    def test_basic_construction(self) -> None:
        r = IPRangeCreate(network_address="192.168.1.0/24", name="Office LAN")
        assert r.network_address == "192.168.1.0/24"
        assert r.dhcp_enabled is False
        assert r.vlan_id is None
        assert r.location is None

    def test_dhcp_enabled(self) -> None:
        r = IPRangeCreate(
            network_address="10.0.0.0/8",
            name="Data Center",
            dhcp_enabled=True,
            vlan_id=100,
        )
        assert r.dhcp_enabled is True
        assert r.vlan_id == 100

    def test_name_max_255(self) -> None:
        IPRangeCreate(network_address="172.16.0.0/12", name="x" * 255)

    def test_name_over_255_raises(self) -> None:
        with pytest.raises(ValidationError):
            IPRangeCreate(network_address="172.16.0.0/12", name="x" * 256)

    def test_with_dns_servers(self) -> None:
        r = IPRangeCreate(
            network_address="192.168.2.0/24",
            name="Branch",
            dns_servers=["8.8.8.8", "8.8.4.4"],
            gateway="192.168.2.1",
        )
        assert len(r.dns_servers) == 2
        assert r.gateway == "192.168.2.1"


# ---------------------------------------------------------------------------
# IPRangeUtilization
# ---------------------------------------------------------------------------


class TestIPRangeUtilization:
    def test_construction(self) -> None:
        u = IPRangeUtilization(
            range_id=uuid.uuid4(),
            network_address="192.168.1.0/24",
            name="Office",
            total_hosts=254,
            assigned_count=100,
            active_count=90,
            reserved_count=10,
            utilization_percent=39.4,
        )
        assert u.total_hosts == 254
        assert u.utilization_percent == 39.4


# ---------------------------------------------------------------------------
# IPAssignmentCreate
# ---------------------------------------------------------------------------


class TestIPAssignmentCreate:
    def test_defaults(self) -> None:
        a = IPAssignmentCreate(
            ip_address="192.168.1.10",
            range_id=uuid.uuid4(),
        )
        assert a.assignment_type == AssignmentType.static
        assert a.status == AssignmentStatus.active
        assert a.mac_address is None
        assert a.device_id is None

    def test_all_assignment_types(self) -> None:
        rid = uuid.uuid4()
        for at in AssignmentType:
            a = IPAssignmentCreate(ip_address="10.0.0.1", range_id=rid, assignment_type=at)
            assert a.assignment_type == at

    def test_all_statuses(self) -> None:
        rid = uuid.uuid4()
        for st in AssignmentStatus:
            a = IPAssignmentCreate(ip_address="10.0.0.1", range_id=rid, status=st)
            assert a.status == st

    def test_with_full_fields(self) -> None:
        a = IPAssignmentCreate(
            ip_address="192.168.1.50",
            mac_address="AA:BB:CC:DD:EE:FF",
            hostname="workstation-01",
            device_id=uuid.uuid4(),
            range_id=uuid.uuid4(),
            assignment_type=AssignmentType.dhcp,
            status=AssignmentStatus.active,
            notes="IT dept PC",
        )
        assert a.hostname == "workstation-01"
        assert a.notes == "IT dept PC"


# ---------------------------------------------------------------------------
# TopologyNode / TopologyEdge / TopologyResponse
# ---------------------------------------------------------------------------


class TestTopologyNode:
    def test_basic(self) -> None:
        n = TopologyNode(id="node-1", label="PC-001", type="device")
        assert n.ip_address is None
        assert n.status is None

    def test_with_optional_fields(self) -> None:
        n = TopologyNode(
            id="gw-1",
            label="Gateway",
            type="gateway",
            ip_address="192.168.1.1",
            status="active",
        )
        assert n.ip_address == "192.168.1.1"


class TestTopologyEdge:
    def test_with_label(self) -> None:
        e = TopologyEdge(source="node-1", target="gw-1", label="LAN")
        assert e.label == "LAN"

    def test_label_optional(self) -> None:
        e = TopologyEdge(source="a", target="b")
        assert e.label is None


class TestTopologyResponse:
    def test_construction(self) -> None:
        nodes = [TopologyNode(id="n1", label="PC", type="device")]
        edges = [TopologyEdge(source="n1", target="gw")]
        r = TopologyResponse(nodes=nodes, edges=edges)
        assert len(r.nodes) == 1
        assert len(r.edges) == 1


# ---------------------------------------------------------------------------
# NetworkScanEntry (network_device schema)
# ---------------------------------------------------------------------------


class TestNetworkScanEntry:
    def test_defaults(self) -> None:
        e = NetworkDeviceScanEntry(
            ip_address="192.168.1.5", mac_address="AA:BB:CC:DD:EE:01"
        )
        assert e.hostname is None
        assert e.device_type == NetworkDeviceType.unknown

    def test_all_device_types(self) -> None:
        for dt in NetworkDeviceType:
            e = NetworkDeviceScanEntry(
                ip_address="10.0.0.1",
                mac_address="AA:BB:CC:DD:EE:FF",
                device_type=dt,
            )
            assert e.device_type == dt


# ---------------------------------------------------------------------------
# NetworkScanRequest / NetworkScanResponse
# ---------------------------------------------------------------------------


class TestNetworkScanRequest:
    def test_empty_devices(self) -> None:
        r = NetworkScanRequest(devices=[])
        assert r.devices == []

    def test_multiple_devices(self) -> None:
        devices = [
            NetworkDeviceScanEntry(ip_address=f"10.0.0.{i}", mac_address=f"AA:BB:CC:DD:EE:{i:02X}")
            for i in range(3)
        ]
        r = NetworkScanRequest(devices=devices)
        assert len(r.devices) == 3


class TestNetworkScanResponse:
    def test_construction(self) -> None:
        r = NetworkScanResponse(created=5, updated=3)
        assert r.created == 5
        assert r.updated == 3


# ---------------------------------------------------------------------------
# NetworkDeviceLinkRequest
# ---------------------------------------------------------------------------


class TestNetworkDeviceLinkRequest:
    def test_construction(self) -> None:
        uid = uuid.uuid4()
        r = NetworkDeviceLinkRequest(device_id=uid)
        assert r.device_id == uid
