import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ADDON_LIST } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { Button, PageSection } from "../ui";
import StatusPill from "../../components/common/StatusPill";
import Table from "../Table";
import ActionPopover from "../ActionPopover";
import { setAddonData, setAddonSelectedItem } from "../../Redux/CardSlice";

function Addon() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchData = async (page = 1, limit = 10) => {
    setLoading(true);

    try {
      const response = await fetchWithRefreshToken(ADDON_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page, limit }),
      });

      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch addons");
      }

      setData(responseData.data || []);
      setTotalCount(responseData.pagination?.totalRecords || 0);
      dispatch(setAddonData(responseData.data || []));
    } catch (error) {
      toast.error(error.message || "Failed to fetch addons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const handleRowAction = (rowData, target) => {
    dispatch(setAddonSelectedItem(rowData));
    navigate(target(rowData.id));
  };

  const handlePageChange = (page, nextPageSize) => {
    setCurrentPage(page);
    setPageSize(nextPageSize);
  };

  const handleOpenActions = (event, rowData) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(rowData);
  };

  const handleCloseActions = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const headers = [
    { key: "id", label: "Id", width: "45px" },
    { key: "addon_group", label: "Group", width: "120px" },
    { key: "min_select", label: "Min", width: "60px" },
    { key: "max_select", label: "Max", width: "60px" },
    { key: "addon_name", label: "Addon Name", width: "140px" },
    {
      key: "addon_price",
      label: "Price",
      width: "90px",
      content: (item) => <span className="font-bold text-text-strong">£{Number(item.addon_price || 0).toFixed(2)}</span>,
    },
    { key: "sort_order", label: "Sort", width: "70px" },
    {
      key: "is_active",
      label: "Status",
      width: "80px",
      sticky: true,
      content: (item) => <StatusPill active={Number(item.is_active) === 1} />,
    },
    {
      key: "actions",
      label: "Actions",
      width: "70px",
      sticky: true,
      content: (rowData) => (
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg border-0 bg-transparent text-[1.4rem] font-black text-brand-500 hover:bg-surface-panel transition-colors"
          onClick={(event) => handleOpenActions(event, rowData)}
        >
          ...
        </button>
      ),
    },
  ];

  return (
    <div className="ui-page">
      <div className="px-6 pt-3 pb-1">
        <PageSection
          eyebrow="Management"
          title="Addon Master"
          actions={
            <Button onClick={() => navigate("/addaddon")}>
              Add Addon Master
            </Button>
          }
        />
      </div>

      <Table
        data={data}
        headers={headers}
        loading={loading}
        searchPlaceholder="Search..."
        totalRowsLabel="Total Rows"
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        totalItems={totalCount}
      />

      <ActionPopover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        handleClose={handleCloseActions}
        selectedRow={selectedRow}
        onEdit={() => handleRowAction(selectedRow, (value) => `/editaddon/${value}`)}
        onView={() => handleRowAction(selectedRow, (value) => `/viewaddon/${value}`)}
        onDelete={() => handleRowAction(selectedRow, (value) => `/deleteaddon/${value}`)}
      />
    </div>
  );
}

export default Addon;
