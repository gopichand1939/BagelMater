import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ITEM_BY_ID } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { getImageUrl } from "../../Utils/imageUrl";
import { setItemSelectedItem } from "../../Redux/CardSlice";
import KeyValueDisplay from "../../components/common/KeyValueDisplay";
import { Button, Card, PageSection } from "../ui";

function ViewItem() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedItem = useSelector((state) => state.card.itemSelectedItem);
  const [item, setItem] = useState(selectedItem);

  useEffect(() => {
    if (
      Number(selectedItem?.id) === Number(id) &&
      typeof selectedItem?.item_image !== "undefined" &&
      typeof selectedItem?.category_image !== "undefined"
    ) {
      setItem(selectedItem);
      return;
    }

    const fetchItem = async () => {
      try {
        const response = await fetchWithRefreshToken(ITEM_BY_ID, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: Number(id) }),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data.message || "Failed to fetch item");
        }

        setItem(data.data);
        dispatch(setItemSelectedItem(data.data));
      } catch (error) {
        toast.error(error.message || "Failed to fetch item");
        navigate("/items");
      }
    };

    fetchItem();
  }, [dispatch, id, navigate, selectedItem]);

  if (!item) {
    return <Card>Loading item...</Card>;
  }

  const displayData = {
    id: item.id,
    category_id: item.category_id,
    category_name: item.category_name || "-",
    item_name: item.item_name || "-",
    item_description: item.item_description || "-",
    item_image: item.item_image || "-",
    price: item.price != null ? `£${Number(item.price).toFixed(2)}` : "£0.00",
    discount_price: item.discount_price != null ? `£${Number(item.discount_price).toFixed(2)}` : "No discount",
    preparation_time: item.preparation_time != null ? `${item.preparation_time} min` : "Not set",
    is_popular: Number(item.is_popular) === 1 ? "Popular" : "Not Popular",
    is_new: Number(item.is_new) === 1 ? "NEW" : "No",
    food_type: Number(item.is_veg) === 1 ? "Veg" : Number(item.is_veg) === 2 ? "Both / N/A" : "Non-Veg",
    is_active: Number(item.is_active) === 1 ? "Active" : "Inactive",
    created_at: new Date(item.created_at).toLocaleString(),
    updated_at: new Date(item.updated_at).toLocaleString(),
  };

  return (
    <div className="ui-page">
      <Card>
        <PageSection
          eyebrow="Items"
          title="View Item"
          actions={
            <Button variant="secondary" onClick={() => navigate("/items")}>
              Back
            </Button>
          }
        />

        <div className="mt-5 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="grid min-w-0 max-w-[760px] content-start gap-[18px]">
            <KeyValueDisplay data={displayData} />
          </div>
          <aside className="grid min-w-0 max-w-[460px] content-start gap-[18px]">
            <div className="grid gap-2">
              <span className="ui-label">Category Image Preview</span>
              <div className="grid min-h-[240px] max-h-[280px] place-items-center overflow-hidden rounded-[20px] border border-dashed border-border-subtle bg-surface-muted">
                <img
                  src={getImageUrl(item, "category_image")}
                  alt={item.category_name || "Category"}
                  className="h-full min-h-[240px] max-h-[280px] w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = `https://placehold.co/600x360?text=${encodeURIComponent(
                      item.category_name || "Category"
                    )}`;
                  }}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="ui-label">Item Image Preview</span>
              <div className="grid min-h-[240px] max-h-[280px] place-items-center overflow-hidden rounded-[20px] border border-dashed border-border-subtle bg-surface-muted">
                <img
                  src={getImageUrl(item, "item_image")}
                  alt={item.item_name}
                  className="h-full min-h-[240px] max-h-[280px] w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = `https://placehold.co/600x360?text=${encodeURIComponent(
                      item.item_name
                    )}`;
                  }}
                />
              </div>
            </div>
          </aside>
        </div>
      </Card>
    </div>
  );
}

export default ViewItem;
