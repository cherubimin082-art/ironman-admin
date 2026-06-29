import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from './AuthContext';

const OrderContext = createContext(null);
let socket = null;

function normalizeOrder(o) {
  let itemsArr = [];
  try {
    itemsArr = typeof o.items === 'string' ? JSON.parse(o.items) : (Array.isArray(o.items) ? o.items : []);
  } catch {}
  const itemsDisplay = itemsArr
    .filter(i => i && i.garment_name)
    .map(i => `${i.quantity}× ${i.garment_name}`)
    .join(', ') || '—';

  return {
    ...o,
    customer: o.customer_name || o.customer || '—',
    amount:   parseFloat(o.total || o.amount || 0),
    time:     o.time_slot || o.slot || o.time || '—',
    zone:     o.apartment  || '—',
    items:    itemsDisplay,
    rawItems: itemsArr,
  };
}

export function OrderProvider({ children }) {
  const { user } = useAuth();
  const [orders, setOrders]                 = useState([]);
  const [pickupJobs, setPickupJobs]         = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading]               = useState(false);
  const loadDataRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'vendor') {
        const { data } = await api.get('/vendor-orders');
        setOrders((data.orders || []).map(normalizeOrder));
      } else if (user.role === 'delivery') {
        const { data } = await api.get('/delivery/assigned-orders');
        setPickupJobs((data.orders || []).map(normalizeOrder));
      } else if (user.role === 'admin') {
        const [ordersRes, statsRes] = await Promise.all([
          api.get('/all-orders'),
          api.get('/dashboard-stats'),
        ]);
        setOrders((ordersRes.data.orders || []).map(normalizeOrder));
        setDashboardStats(statsRes.data);
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Keep ref always pointing to latest loadData so socket callbacks never go stale
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  useEffect(() => {
    if (!user) {
      if (socket) { socket.disconnect(); socket = null; }
      setOrders([]);
      setPickupJobs([]);
      return;
    }
    loadData();
    if (!socket) {
      socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
      });
      const joinRooms = () => {
        if (user.role === 'vendor')        socket.emit('join_vendor', user.id);
        else if (user.role === 'delivery') socket.emit('join_delivery', user.id);
        else if (user.role === 'admin')    socket.emit('join_admin');
      };
      socket.on('connect', joinRooms);
      // On reconnect after drop, re-join rooms and refresh data
      socket.on('reconnect', () => { joinRooms(); loadDataRef.current?.(); });

      const reload = () => loadDataRef.current?.();
      socket.on('new_order',                reload);
      socket.on('order_update',             reload);
      socket.on('order_status_update',      reload);
      socket.on('new_delivery_order',       reload);
      socket.on('new_assignment',           reload);   // admin assigns delivery agent
      socket.on('assignment_updated',       reload);
      socket.on('order_ready_for_pickup',   reload);
      socket.on('order_ready_for_delivery', reload);
      socket.on('order_at_vendor',          reload);
      socket.on('order_ironing',            reload);
      socket.on('order_delivered',          reload);
      socket.on('order_cancelled',          reload);
    }

    // When APK comes back to foreground, refresh data (socket may have missed events)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadDataRef.current?.();
        if (socket && !socket.connected) socket.connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user, loadData]);

  // Vendor API actions
  const vendorAction = async (orderId, action, reason = null) => {
    const endpointMap = {
      accept:        `/accept-order/${orderId}`,
      reject:        `/reject-order/${orderId}`,
      start_ironing: `/vendor/start-ironing/${orderId}`,
      mark_complete: `/mark-complete/${orderId}`,
    };
    const endpoint = endpointMap[action];
    if (!endpoint) return;
    try {
      const body = (action === 'reject' && reason) ? { reason } : {};
      await api.put(endpoint, body);
      await loadData();
    } catch (err) {
      console.error('vendorAction error:', err.response?.data || err.message);
      throw err;
    }
  };

  // Delivery API actions
  const deliveryAction = async (orderId, action, body = {}) => {
    const endpointMap = {
      accept:              `/delivery/accept-order/${orderId}`,
      reach_pickup:        `/delivery/reached-for-pickup/${orderId}`,
      confirm_pickup:      `/delivery/confirm-pickup/${orderId}`,
      verify_pickup_otp:   `/delivery/verify-pickup-otp/${orderId}`,
      drop_at_vendor:      `/delivery/dropped-at-vendor/${orderId}`,
      pick_from_vendor:    `/delivery/picked-from-vendor/${orderId}`,
      start_ride:          `/delivery/start-ride/${orderId}`,
      restart_delivery:    `/delivery/restart-delivery/${orderId}`,
      end_ride:            `/delivery/end-ride/${orderId}`,
      verify_delivery_otp: `/delivery/verify-delivery-otp/${orderId}`,
    };
    const endpoint = endpointMap[action];
    if (!endpoint) throw new Error('Unknown delivery action: ' + action);
    await api.put(endpoint, body);
    await loadData();
  };

  const updateOrderStatus = (orderId, status) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  // Legacy alias used by PickupJobsPage
  const acceptPickupJob = async (jobId) => {
    await deliveryAction(jobId, 'accept');
  };

  return (
    <OrderContext.Provider value={{
      orders, pickupJobs, dashboardStats, loading,
      updateOrderStatus, acceptPickupJob, loadData, vendorAction, deliveryAction,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used inside OrderProvider');
  return ctx;
}
