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
  // 计算卫星朝向：使得模型头部(+X)对准速度方向，顶部(+Z)背离地心
  const computeOrientation = (pos: Cesium.Cartesian3, vel: Cesium.Cartesian3, time: Cesium.JulianDate) => {
    // 防止速度为0
    if (Cesium.Cartesian3.magnitude(vel) === 0) return undefined;

    // forward: 速度方向
    const forward = Cesium.Cartesian3.normalize(vel, new Cesium.Cartesian3());
    // up: 位置方向（背离地心）
    const up = Cesium.Cartesian3.normalize(pos, new Cesium.Cartesian3());
    // right = forward x up
    const right = Cesium.Cartesian3.cross(forward, up, new Cesium.Cartesian3());
    // 重新正交化 up = right x forward
    Cesium.Cartesian3.cross(right, forward, up);

    const rotMatrix = new Cesium.Matrix3();
    Cesium.Matrix3.setColumn(rotMatrix, 0, forward, rotMatrix);
    Cesium.Matrix3.setColumn(rotMatrix, 1, right, rotMatrix);
    Cesium.Matrix3.setColumn(rotMatrix, 2, up, rotMatrix);

    const eciQuat = Cesium.Quaternion.fromRotationMatrix(rotMatrix);

    // ECI(惯性系) 到 ECEF(地固系) 的旋转转换矩阵
    const temeToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
    if (!temeToFixed) {
      return new Cesium.ConstantProperty(eciQuat); // 如果无法转换，默认返回 ECI
    }

    const fixedRotMatrix = new Cesium.Matrix3();
    Cesium.Matrix3.multiply(temeToFixed, rotMatrix, fixedRotMatrix);
    const fixedQuat = Cesium.Quaternion.fromRotationMatrix(fixedRotMatrix);
    return new Cesium.ConstantProperty(fixedQuat);
  };

  const createSatelliteEntity = (satData: any, time: Cesium.JulianDate) => {
    if (!viewer) return;

    // JSON 数据单位是"千米"(km)，所以需要 * 1000 转换为 Cesium 使用的"米"(m)
    const position = new Cesium.Cartesian3(
      satData.position_ECI[0] * 1000,
      satData.position_ECI[1] * 1000,
      satData.position_ECI[2] * 1000
    );

    const velocity = new Cesium.Cartesian3(
      satData.velocity_ECI[0] * 1000,
      satData.velocity_ECI[1] * 1000,
      satData.velocity_ECI[2] * 1000
    );

    const entity = viewer.entities.add({
      id: `sat_${satData.sat_id}`,
      name: satData.name || `Satellite ${satData.sat_id}`,
      // 必须在这里就给到 SampledPositionProperty 才能让轨迹随着时间差顺滑推进
      position: new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.INERTIAL),
      orientation: new Cesium.SampledProperty(Cesium.Quaternion),
      model: {
        uri: '/models/satellite.glb',
        minimumPixelSize: 128,
        maximumScale: 1000,
        scale: 3.0,
      },
      label: {
        text: satData.name || `Sat-${satData.sat_id}`,
        font: '12px sans-serif',
        showBackground: true,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20),
      }
    });

    // 记录初始帧信息
    const posProp = entity.position as Cesium.SampledPositionProperty;
    posProp.addSample(time, position);

    // 初始化时也预先把姿态放进去
    const initOriQ = computeOrientation(position, velocity, time);
    const oriProp = entity.orientation as Cesium.SampledProperty;
    if (initOriQ instanceof Cesium.ConstantProperty) {
      oriProp.addSample(time, initOriQ.getValue(time));
    }

    satelliteEntities.set(satData.sat_id, entity);
  };

  const updateSatelliteEntity = (satData: any, time: Cesium.JulianDate) => {
    const entity = satelliteEntities.get(satData.sat_id);
    if (!entity) return;

    // 更新位置, ECI坐标系 (INERTIAL)，JSON数据为千米，转换为米(m)
    const newPos = new Cesium.Cartesian3(
      satData.position_ECI[0] * 1000,
      satData.position_ECI[1] * 1000,
      satData.position_ECI[2] * 1000
    );
    const newVel = new Cesium.Cartesian3(
      satData.velocity_ECI[0] * 1000,
      satData.velocity_ECI[1] * 1000,
      satData.velocity_ECI[2] * 1000
    );

    // 计算卫星当前位置与速度对应的采样时间
    let sampleTime = time;

    // 当多次插值时我们需要为 SampledPositionProperty 注入新的位置信息
    let posProp = entity.position as Cesium.SampledPositionProperty;
    if (!(posProp instanceof Cesium.SampledPositionProperty)) {
      // 第一次发现不是 SampledPositionProperty 时重新实例化平滑插值属性
      posProp = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.INERTIAL);
      // 使用拉格朗日插值平滑位置信息
      posProp.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
      });
      entity.position = posProp;
    }

    // 给对应的时间点注入新的位置坐标
    posProp.addSample(sampleTime, newPos);

    // 对于朝向也可以采用平滑属性 SampledProperty
    let oriProp = entity.orientation as Cesium.SampledProperty;
    if (!(oriProp instanceof Cesium.SampledProperty)) {
      oriProp = new Cesium.SampledProperty(Cesium.Quaternion);
      // 为了防止震荡，朝向通常使用线性插值或球形线性插值
      oriProp.setInterpolationOptions({
        interpolationDegree: 1,
        interpolationAlgorithm: Cesium.LinearApproximation
      });
      entity.orientation = oriProp;
    }

    const oriQ = computeOrientation(newPos, newVel, sampleTime);
    if (oriQ instanceof Cesium.ConstantProperty) {
      oriProp.addSample(sampleTime, oriQ.getValue(sampleTime));
    }
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

      // 同步仿真时间到 Cesium 的时钟
      let simTime = viewer.clock.currentTime;
      if (store.currentTime) {
        // "2026-01-16 02:00:00" => 替换为空格以支持转 ISO8601
        try {
          const dateStr = store.currentTime.trim().replace(' ', 'T') + 'Z';
          simTime = Cesium.JulianDate.fromIso8601(dateStr);
          viewer.clock.currentTime = simTime;
        } catch (e) {
          console.warn('[Cesium sync clock error]', e);
        }
      }

      // 1. 更新或创建所有卫星
      info.satellites.forEach(sat => {
        if (!satelliteEntities.has(sat.sat_id)) {
          createSatelliteEntity(sat, simTime);
        } else {
          updateSatelliteEntity(sat, simTime);
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
