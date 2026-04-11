export interface Satellite {
  sat_id: number;
  name: string;
  sat_type: string;
  constellation_id: number;
  orbit_id: number;
  inner_id: number;
  position_ECI: [number, number, number];
  velocity_ECI: [number, number, number];
  orbit_a: number;
  orbit_e: number;
  orbit_i: number;
  orbit_R: number;
  orbit_w: number;
  orbit_M: number;
}

export interface ConstellationInfo {
  constellation_id: number;
  constellation_name: string;
  orbit_number: number;
  satellite_per_orbit: number;
  same_orbit_link: number;
  cross_orbit_link: number | null;
  same_orbit_phase: number;
  cross_orbit_phase: number | null;
  satellites: Satellite[];
}

export type LinkData = [number, number, number]; // [link_id, source_sat_id, target_sat_id]

export interface InitLinks {
  same_orbit_links: LinkData[];
  cross_orbit_links: LinkData[];
}

export interface SimulationLinks {
  cur_frame_deleted_links: number[]; // [link_id, ...]
  cur_frame_add_user_links: LinkData[];
  cur_frame_add_feeder_links: LinkData[];
}

export interface FrameData {
  type: 'init' | 'simulation';
  simulation_current_time: string;
  total_frames: number;
  cur_frame: number;
  constellation: ConstellationInfo;
  links: InitLinks | SimulationLinks;
  timestamp: string;
}
