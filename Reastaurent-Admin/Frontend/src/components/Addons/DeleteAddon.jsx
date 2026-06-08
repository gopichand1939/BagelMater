import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ADDON_BY_ID, ADDON_DELETE } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { setAddonSelectedItem } from "../../Redux/CardSlice";
import KeyValueDisplay from "../../components/common/KeyValueDisplay";
import { Button, Card, PageSection } from "../ui";

function DeleteAddon() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedAddon = useSelector((state) => state.card.addonSelectedItem);
  const [addon, setAddon] = useState(selectedAddon);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!addon?.id) {
      toast.error("No addon selected");
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetchWithRefreshToken(ADDON_DELETE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: addon.id }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete addon");
      }

      toast.success("Addon deleted successfully");
      navigate("/addon");
    } catch (error) {
      toast.error(error.message || "Failed to delete addon");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!addon) {
    return <Card>Loading addon...</Card>;
  }

  const displayData = {
    id: addon.id,
    addon_group: addon.addon_group || "-",
    addon_name: addon.addon_name || "-",
    addon_price: addon.addon_price != null ? `£${Number(addon.addon_price).toFixed(2)}` : "£0.00",
    sort_order: addon.sort_order != null ? addon.sort_order : 0,
    is_active: Number(addon.is_active) === 1 ? "Active" : "Inactive",
    created_at: new Date(addon.created_at).toLocaleString(),
    updated_at: new Date(addon.updated_at).toLocaleString(),
  };

  return (
    <div className="ui-page">
      <PageSection
        eyebrow="Addon"
        title="Delete Addon Master"
        subtitle="Use the centralized danger action below if you want to remove this addon master option."
        actions={<Button variant="secondary" onClick={() => navigate("/addon")}>Back</Button>}
      />

      <Card tone="danger" className="mt-0">
        <KeyValueDisplay data={displayData} />
      </Card>

      <div className="mt-0.5 flex flex-wrap gap-2.5">
        <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Confirm Delete"}
        </Button>
        <Button variant="secondary" onClick={() => navigate("/addon")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default DeleteAddon;
