import type { DroneModel } from '../types';

export const DRONE_MODELS: DroneModel[] = [
  {
    id: 'yunbee-10',
    name: '云蜂-10',
    payload: 10,
    endurance: 20,
    speed: 5,
    sprayWidth: 3,
    costPerSortie: 80,
    description:
      '小型多旋翼植保无人机，机身轻巧灵活，适合小面积地块作业。转弯半径小，可在狭窄地块间穿梭，是新手入门的理想选择。',
  },
  {
    id: 'yunbee-16',
    name: '云蜂-16',
    payload: 16,
    endurance: 25,
    speed: 6,
    sprayWidth: 4,
    costPerSortie: 120,
    description:
      '中型多旋翼植保无人机，载药量与续航均衡，作业效率稳定。适用于中等面积地块，是市面上使用最广泛的植保机型。',
  },
  {
    id: 'yunbee-25',
    name: '云蜂-25',
    payload: 25,
    endurance: 18,
    speed: 4,
    sprayWidth: 5,
    costPerSortie: 160,
    description:
      '大型多旋翼植保无人机，载药量充足，单架次覆盖面积大。适合大面积连片地块作业，但因机身较重续航略短，需合理规划补给点。',
  },
  {
    id: 'yuneagle-40',
    name: '云鹰-40',
    payload: 40,
    endurance: 40,
    speed: 8,
    sprayWidth: 6,
    costPerSortie: 280,
    description:
      '油动直升机植保无人机，续航能力强、飞行速度快，适合丘陵山地等复杂地形长距离作业。但运营成本较高，需注意噪声与排放对周边环境的影响。',
  },
];
