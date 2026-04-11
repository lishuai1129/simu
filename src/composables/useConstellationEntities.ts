import { watch, onBeforeUnmount } from 'vue';
import * as Cesium from 'cesium';
import { useConstellationStore } from '@/store/modules/constellation';

export function useConstellationEntities(viewer: Cesium.Viewer | null) {
  const store = useConstellationStore();

  // 存储我们创建的 Cesium 实体的引用，用于随帧更新位置或清理
  const satelliteEntities = new Map<number, Cesium.Entity>();
  const linkEntities = new Map<number, Cesium.Entity>();

  // 卫星模型（可替换为您项目里的真实3D模型，比如无人机的 glb）
  // 暂时使用简单的点（PointGraphics）作为演示
  const createSatelliteEntity = (satData: any) => {
    if (!viewer) return;
    
    // 【换算】将 JSON 中的 [x, y, z] (可能是米，由于后端通常为 ECI / ECEF) 直接转化为 Cartesian3
    const position = new Cesium.Cartesian3(
      satData.position_ECI[0],
      satData.position_ECI[1],
      satData.position_ECI[2]
    );

    const entity = viewer.entities.add({
      id: `sat_${satData.sat_id}`,
      name: satData.name || `Satellite ${satData.sat_id}`,
      position: position,
      point: {
        pixelSize: 8,
        color: Cesium.Color.fromCssColorString('#00ff00'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
      },
      label: {
        text: satData.name || `Sat-${satData.sat_id}`,
        font: '12px sans-serif',
        showBackground: true,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10),
      }
    });

    satelliteEntities.set(satData.sat_id, entity);
  };

  const updateSatelliteEntity = (satData: any) => {
    const entity = satelliteEntities.get(satData.sat_id);
    if (!entity) return;

    // 更新位置
    const newPos = new Cesium.Cartesian3(
      satData.position_ECI[0],
      satData.position_ECI[1],
      satData.position_ECI[2]
    );
    entity.position = new Cesium.ConstantPositionProperty(newPos);
  };

  const createOrUpdateLink = (linkId: number, sourceId: number, targetId: number) => {
    if (!viewer) return;
    const sourceEnt = satelliteEntities.get(sourceId);
    const targetEnt = satelliteEntities.get(targetId);

    // 如果首尾卫星还没渲染出来，则绘制失败
    if (!sourceEnt || !targetEnt) return;

    const existingLink = linkEntities.get(linkId);
    if (existingLink) {
      // 在用 CallbackProperty 绑定位置的情况下，不用每帧手动更新连线实体 
      //线段位置会自动跟随首尾端点 (CallbackProperty)
      return; 
    }

    // 新增链路实体
    const linkEntity = viewer.entities.add({
      id: `sat_link_${linkId}`,
      name: `Link ${sourceId} <-> ${targetId}`,
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const sPos = sourceEnt.position?.getValue(viewer.clock.currentTime);
          const tPos = targetEnt.position?.getValue(viewer.clock.currentTime);
          if (sPos && tPos) {
            return [sPos, tPos];
          }
          return [];
        }, false),
        width: 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.CYAN,
          dashLength: 16.0,
        }),
        arcType: Cesium.ArcType.NONE // 星际线通常打直
      },
    });

    linkEntities.set(linkId, linkEntity);
  };

  // 清除地图上不存在的旧链路
  const cleanupOldLinks = (activeLinkIds: Set<number>) => {
    if (!viewer) return;
    for (const [linkId, entity] of linkEntities.entries()) {
      if (!activeLinkIds.has(linkId)) {
        viewer.entities.remove(entity);
        linkEntities.delete(linkId);
      }
    }
  };

  // 全量清空
  const clearAll = () => {
    if (!viewer) return;
    for (const entity of satelliteEntities.values()) {
      viewer.entities.remove(entity);
    }
    satelliteEntities.clear();

    for (const entity of linkEntities.values()) {
      viewer.entities.remove(entity);
    }
    linkEntities.clear();
  };

  // 监听 pinia 中数据的变化进行重绘
  const stopWatch = watch(
    () => store.lastUpdate,
    () => {
      if (!viewer) return;

      const info = store.constellationInfo;
      if (!info) {
        clearAll();
        return;
      }

      // 1. 更新或创建所有卫星
      info.satellites.forEach(sat => {
        if (!satelliteEntities.has(sat.sat_id)) {
          createSatelliteEntity(sat);
        } else {
          updateSatelliteEntity(sat);
        }
      });

      // 2. 更新或创建活跃链路
      const activeIds = new Set<number>();
      for (const [linkId, linkData] of store.activeLinks.entries()) {
        activeIds.add(linkId);
        createOrUpdateLink(linkId, linkData[1], linkData[2]);
      }

      // 3. 移除已被仿真断开的无效链路
      cleanupOldLinks(activeIds);
    }
  );

  onBeforeUnmount(() => {
    stopWatch();
    clearAll();
  });

  return {
    clearAll
  };
}
