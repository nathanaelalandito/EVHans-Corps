import { useCallback, useEffect, useRef, useState } from 'react';
import { FaMapMarkerAlt, FaRedoAlt } from 'react-icons/fa';
import api from './api/client';
import './operatorStationPicker.css';

/**
 * Pemilih station aktif untuk semua modul Operator.
 * Station pertama dari penugasan dipakai otomatis bila belum ada pilihan sesi.
 */
export default function OperatorStationPicker({ onStationChange }) {
    const [stations, setStations] = useState([]);
    const [activeId, setActiveId] = useState(() => localStorage.getItem('ev_active_station_id') || '');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const onStationChangeRef = useRef(onStationChange);
    onStationChangeRef.current = onStationChange;

    /** Memuat station yang ditugaskan dan memulihkan pilihan terakhir yang masih valid. */
    const loadStations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/operator/stations');
            const list = data.data || [];
            setStations(list);
            const saved = localStorage.getItem('ev_active_station_id');
            const allowed = list.some(station => String(station.id_location) === String(saved));
            const nextId = allowed ? saved : list[0]?.id_location;
            if (nextId) {
                localStorage.setItem('ev_active_station_id', String(nextId));
                setActiveId(String(nextId));
                if (!allowed) onStationChangeRef.current?.(String(nextId));
            } else {
                localStorage.removeItem('ev_active_station_id');
                setActiveId('');
            }
        } catch {
            setError('Daftar station belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStations();
    }, [loadStations]);

    /** Menyimpan pilihan station dan meminta dashboard memuat konteks station baru. */
    const selectStation = event => {
        const nextId = event.target.value;
        localStorage.setItem('ev_active_station_id', nextId);
        setActiveId(nextId);
        onStationChange?.(nextId);
    };

    if (loading) return <div className="operator-station-picker is-state" role="status"><FaMapMarkerAlt aria-hidden="true" /><span>Memuat station…</span></div>;
    if (error) return <button className="operator-station-picker is-state is-error" type="button" onClick={loadStations}><FaRedoAlt aria-hidden="true" /><span>{error} Coba lagi</span></button>;
    if (!stations.length) return <div className="operator-station-picker is-state" role="status"><FaMapMarkerAlt aria-hidden="true" /><span>Belum ada station tugas</span></div>;
    return <label className="operator-station-picker">
        <FaMapMarkerAlt aria-hidden="true" />
        <span>Station aktif</span>
        {stations.length === 1
            ? <strong>{stations[0].kode_station} · {stations[0].nama_lokasi}</strong>
            : <select aria-label="Pilih station aktif" value={activeId} onChange={selectStation}>
                {stations.map(station => <option key={station.id_location} value={station.id_location}>{station.kode_station} · {station.nama_lokasi}</option>)}
            </select>}
    </label>;
}
