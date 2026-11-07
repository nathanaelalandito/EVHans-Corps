import { useEffect, useState } from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';
import api from './api/client';
import './operatorStationPicker.css';

/**
 * Pemilih station aktif untuk semua modul Operator.
 * Station pertama dari penugasan dipakai otomatis bila belum ada pilihan sesi.
 */
export default function OperatorStationPicker({ onStationChange }) {
    const [stations, setStations] = useState([]);
    const [activeId, setActiveId] = useState(() => localStorage.getItem('ev_active_station_id') || '');

    useEffect(() => {
        let mounted = true;
        api.get('/operator/stations').then(({ data }) => {
            if (!mounted) return;
            const list = data.data || [];
            setStations(list);
            const saved = localStorage.getItem('ev_active_station_id');
            const allowed = list.some(station => String(station.id_location) === String(saved));
            const nextId = allowed ? saved : list[0]?.id_location;
            if (nextId) {
                localStorage.setItem('ev_active_station_id', String(nextId));
                setActiveId(String(nextId));
            }
        }).catch(() => mounted && setStations([]));
        return () => { mounted = false; };
    }, []);

    const selectStation = event => {
        const nextId = event.target.value;
        localStorage.setItem('ev_active_station_id', nextId);
        setActiveId(nextId);
        onStationChange?.(nextId);
    };

    if (stations.length < 2) return null;
    return <label className="operator-station-picker"><FaMapMarkerAlt /><span>Station aktif</span><select value={activeId} onChange={selectStation}>{stations.map(station => <option key={station.id_location} value={station.id_location}>{station.nama_lokasi}</option>)}</select></label>;
}
