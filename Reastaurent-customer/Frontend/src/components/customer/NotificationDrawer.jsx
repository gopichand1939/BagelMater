import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { customerAuthStorage } from "../../auth/customerAuthStorage";
import {
  fetchCustomerNotifications,
  markAllCustomerNotificationsAsRead,
  markCustomerNotificationAsRead,
  fetchCustomerUnreadNotificationSummary,
} from "../../services/customerNotificationApi";
import { stopCustomerNotificationAlert } from "../../Utils/notificationSound";

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (_error) {
    return value;
  }
};

export default function NotificationDrawer({
  open,
  onClose,
  notificationsRefreshKey = 0,
  onNotificationSummaryChange,
}) {
  const LIVE_ITEM_HIGHLIGHT_MS = 30000;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    
    stopCustomerNotificationAlert();

    let cancelled = false;
    const loadNotifications = async () => {
      setLoading(true);
      setError("");
      try {
        const accessToken = customerAuthStorage.getAccessToken();
        if (!accessToken) return;

        const result = await fetchCustomerNotifications(accessToken, { page: 1, limit: 30 });
        if (!cancelled) {
          setNotifications(result.data || []);
          if (notificationsRefreshKey > 0 && result.data?.[0]?.id) {
            const id = Number(result.data[0].id);
            setHighlightedIds((prev) => [...new Set([...prev, id])]);
            setTimeout(() => {
              setHighlightedIds((prev) => prev.filter((v) => v !== id));
            }, LIVE_ITEM_HIGHLIGHT_MS);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setNotifications([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    void loadNotifications();
    return () => { cancelled = true; };
  }, [open, notificationsRefreshKey]);

  const refreshNotificationSummary = async () => {
    try {
      const accessToken = customerAuthStorage.getAccessToken();
      const summary = await fetchCustomerUnreadNotificationSummary(accessToken, 10);
      onNotificationSummaryChange?.(summary);
    } catch (_error) {
      onNotificationSummaryChange?.({ unreadCount: 0, notifications: [] });
    }
  };

  const openNotification = async (notification) => {
    if (!notification || Number(notification.is_read) === 1) return;

    try {
      const accessToken = customerAuthStorage.getAccessToken();
      await markCustomerNotificationAsRead(notification.id, accessToken);
      setNotifications((prev) =>
        prev.map((entry) =>
          entry.id === notification.id
            ? { ...entry, is_read: 1, read_at: new Date().toISOString() }
            : entry
        )
      );
      setHighlightedIds((prev) => prev.filter((v) => v !== Number(notification.id)));
      await refreshNotificationSummary();
    } catch (err) {
      setError(err.message);
    }
  };

  const markAllRead = async () => {
    setMarkingAllRead(true);
    setError("");
    try {
      const accessToken = customerAuthStorage.getAccessToken();
      await markAllCustomerNotificationsAsRead(accessToken);
      setNotifications((prev) =>
        prev.map((entry) => ({
          ...entry,
          is_read: 1,
          read_at: entry.read_at || new Date().toISOString(),
        }))
      );
      await refreshNotificationSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm" />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-[#110e0d] border-l border-white/10 shadow-2xl flex flex-col z-[221]">
        <div className="flex items-center justify-between border-b border-white/5 pb-5 px-6 pt-8">
          <div>
            <h2 className="m-0 font-serif text-2xl font-bold text-white">Notifications</h2>
            <p className="mt-1 font-sans text-xs text-white/50 uppercase tracking-wider">Stay updated</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              disabled={markingAllRead || notifications.length === 0}
              className="text-xs font-bold uppercase tracking-wider text-cafe-gold hover:text-white transition-colors disabled:opacity-50 px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-cafe-gold hover:text-[#110e0d]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-3">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-cafe-gold rounded-full"></div>
                  <div className="h-2 w-2 bg-cafe-gold rounded-full delay-75"></div>
                  <div className="h-2 w-2 bg-cafe-gold rounded-full delay-150"></div>
                </div>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
                  <span className="text-2xl opacity-50">📭</span>
                </div>
                <h3 className="text-white font-serif text-lg mb-1">All caught up</h3>
                <p className="text-white/40 text-sm">You have no new notifications.</p>
              </div>
            )}

            {notifications.map((notification) => {
              const highlighted = highlightedIds.includes(Number(notification.id));
              const isRead = Number(notification.is_read) === 1;

              return (
                <button
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                  className={`group relative flex gap-4 rounded-2xl p-4 text-left transition-all duration-300 ${
                    highlighted
                      ? "bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(202,138,4,0.3)]"
                      : isRead
                        ? "hover:bg-white/[0.02]"
                        : "bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  {!isRead && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cafe-gold rounded-r-full" />
                  )}
                  
                  <div className="flex-1 min-w-0 pl-1">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className={`font-bold text-sm truncate ${isRead ? 'text-white/70' : 'text-white'}`}>
                        {notification.title}
                      </div>
                      <div className="text-[10px] font-bold tracking-wider text-white/40 whitespace-nowrap">
                        {formatDateTime(notification.created_at)}
                      </div>
                    </div>
                    <div className={`text-sm leading-relaxed line-clamp-2 ${isRead ? 'text-white/40' : 'text-white/70'}`}>
                      {notification.message}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
