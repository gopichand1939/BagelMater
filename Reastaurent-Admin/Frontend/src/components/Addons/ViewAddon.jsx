import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ADDON_BY_ID } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { setAddonSelectedItem } from "../../Redux/CardSlice";
import KeyValueDisplay from "../../components/common/KeyValueDisplay";
import { Button, Card, PageSection } from "../ui";

function ViewAddon() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedAddon = useSelector((state) => state.card.addonSelectedItem);
  const [addon, setAddon] = useState(selectedAddon);

  useEffect(() => {
    if (Number(selectedAddon?.id) === Number(id)) {
      setAddon(selectedAddon);
      return;
    }

    const fetchAddon = async () => {
      try {
        const response = await fetchWithRefreshToken(ADDON_BY_ID, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: Number(id) }),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data.message || "Failed to fetch addon");
        }

        setAddon(data.data);
        dispatch(setAddonSelectedItem(data.data));
      } catch (error) {
        toast.error(error.message || "Failed to fetch addon");
        navigate("/addon");
      }
    };

    fetchAddon();
  }, [dispatch, id, navigate, selectedAddon]);

  if (!addon) {
    return (
      <div className="ui-page">
        <Card className="flex min-h-[200px] items-center justify-center text-text-muted">
          Loading addon details...
        </Card>
      </div>
    );
  }

  const displayData = {
    id: addon.id,
    addon_group: addon.addon_group || "-",
    min_select: addon.min_select != null ? addon.min_select : 0,
    max_select: addon.max_select != null ? addon.max_select : 99,
    addon_name: addon.addon_name || "-",
    addon_price: addon.addon_price != null ? `£${Number(addon.addon_price).toFixed(2)}` : "£0.00",
    sort_order: addon.sort_order != null ? addon.sort_order : 0,
    is_active: Number(addon.is_active) === 1 ? "Active" : "Inactive",
    created_at: new Date(addon.created_at).toLocaleString(),
    updated_at: new Date(addon.updated_at).toLocaleString(),
  };

  return (
    <div className="ui-page">
      <div className="px-6 pt-3 pb-1">
        <PageSection
          eyebrow="Addon"
          title="View Addon Master"
          actions={
            <Button variant="secondary" onClick={() => navigate("/addon")}>
              Back
            </Button>
          }
        />
      </div>

      <Card>
        <div className="grid max-w-[760px] content-start gap-[18px]">
          <KeyValueDisplay data={displayData} />
        </div>
      </Card>
    </div>
  );
}

export default ViewAddon;
