import type { EncyclopediaEntry } from '../types';

export const ENCYCLOPEDIA_ENTRIES: EncyclopediaEntry[] = [
  {
    id: 'err-overlap',
    category: 'error',
    title: '重复喷洒',
    content:
      '重复喷洒是指无人机在同一区域多次喷洒药液，导致农药用量超标。这不仅浪费药剂增加成本，还可能造成作物药害和环境污染。常见原因包括航线规划不合理、转弯重叠区未设置关闭喷洒、多架无人机区域分配不清晰。建议使用梳式航线并合理设置转弯缓冲带，同时在多机协同时明确各自的作业边界。',
    icon: 'Copy',
    relatedEntries: ['str-comb', 'err-miss'],
  },
  {
    id: 'err-miss',
    category: 'error',
    title: '漏喷区域',
    content:
      '漏喷是指部分地块未被喷洒覆盖，导致病虫害防治出现盲区。漏喷通常由航线间距过大、喷幅未重叠、转弯处航线偏移或地形遮挡等原因引起。漏喷区域容易成为病虫害的滋生源头，影响整体防治效果。建议根据无人机的喷幅宽度精确计算航线间距，并在地形复杂区域适当增加覆盖冗余。',
    icon: 'EyeOff',
    relatedEntries: ['err-overlap', 'str-comb'],
  },
  {
    id: 'err-danger',
    category: 'error',
    title: '危险穿越',
    content:
      '危险穿越是指无人机航线经过高压线、建筑物、人群等危险区域。穿越高压线可能导致电磁干扰使无人机失控，靠近建筑物和树木可能发生碰撞，飞越人群则存在严重安全隐患。规划航线时应充分标注障碍物位置并设置安全缓冲距离，遇到突发人群出现应立即调整航线或暂停作业。',
    icon: 'AlertTriangle',
    relatedEntries: ['weather-wind', 'str-takeoff'],
  },
  {
    id: 'str-comb',
    category: 'strategy',
    title: '梳式航线',
    content:
      '梳式航线是最常用的植保无人机航线规划策略，无人机沿平行线往返飞行，形如梳齿。航线间距根据喷幅宽度设定，一般保留10%-20%的重叠率以确保覆盖完整。梳式航线规划简单、喷洒均匀，适用于规则形状的连片地块。对于不规则地块，可在梳式航线基础上配合边缘包络航线进行补充覆盖。',
    icon: 'AlignJustify',
    relatedEntries: ['err-overlap', 'err-miss', 'str-ant'],
  },
  {
    id: 'str-ant',
    category: 'strategy',
    title: '蚁群覆盖',
    content:
      '蚁群覆盖策略模拟蚂蚁觅食路径的优化过程，通过多次迭代寻找最优覆盖路径。该策略适用于零散分布的多个小地块，能够在地块间自动规划高效的转场路线。蚁群算法考虑了飞行距离、转弯次数、喷洒效率等多维因素，在复杂场景下往往比简单梳式航线更优，但计算量较大，需提前预规划。',
    icon: 'Route',
    relatedEntries: ['str-comb', 'str-takeoff'],
  },
  {
    id: 'str-takeoff',
    category: 'strategy',
    title: '起降点优化',
    content:
      '起降点优化是选择最优的无人机起降位置，以减少空飞距离、提高作业效率的策略。起降点应尽量靠近作业地块中心或多个地块的几何重心，同时需确保起降点周围无障碍物、地面平整坚实。对于大面积多地块作业，可设置多个起降点分别服务不同区域，配合补给点实现连续作业。',
    icon: 'MapPin',
    relatedEntries: ['str-ant', 'drone-battery'],
  },
  {
    id: 'weather-wind',
    category: 'weather',
    title: '大风影响',
    content:
      '大风是影响植保无人机作业最显著的气象因素。风速超过3m/s时药液雾滴会发生明显漂移，导致喷洒不均匀；风速超过5m/s时应暂停喷洒作业。风向也会影响漂移方向，规划航线时应使喷洒方向与风向垂直或逆风飞行。阵风还可能导致无人机姿态不稳，增加飞行风险，需适当降低飞行高度增强稳定性。',
    icon: 'Wind',
    relatedEntries: ['err-danger', 'weather-rain'],
  },
  {
    id: 'weather-rain',
    category: 'weather',
    title: '降雨作业限制',
    content:
      '降雨天气对植保无人机作业有严格限制。中雨及以上天气严禁作业，小雨天气可作业但药液会被雨水冲刷流失，大幅降低防治效果。如必须在雨季窗口期作业，应选择雨歇间隙并使用耐雨水冲刷剂型。降雨还会影响无人机电子设备的防水性能，增加故障风险，作业前需确认无人机的防水等级。',
    icon: 'CloudRain',
    relatedEntries: ['weather-wind', 'weather-heat'],
  },
  {
    id: 'weather-heat',
    category: 'weather',
    title: '高温蒸发',
    content:
      '高温环境下药液雾滴蒸发速度加快，有效沉积量减少，防治效果下降。当气温超过35°C时，小雾滴在到达作物表面前可能已蒸发殆尽。高温还会加速无人机电池放电，缩短续航时间约15%-25%。建议在清晨或傍晚气温较低时段作业，并适当增大雾滴粒径、降低飞行高度以减少蒸发损失。',
    icon: 'Thermometer',
    relatedEntries: ['weather-rain', 'drone-battery'],
  },
  {
    id: 'drone-rotor',
    category: 'drone',
    title: '多旋翼适用场景',
    content:
      '多旋翼植保无人机结构简单、操作便捷、维护成本低，适用于平坦连片地块的常规喷洒作业。多旋翼可悬停、转弯灵活，在零散小地块间转场方便。但多旋翼续航有限（通常15-25分钟），载药量较小（10-25L），在大面积作业时需频繁更换电池和补充药液，作业效率受限于补给频率。',
    icon: 'Cpu',
    relatedEntries: ['drone-fuel', 'drone-battery'],
  },
  {
    id: 'drone-fuel',
    category: 'drone',
    title: '油动直升机优势',
    content:
      '油动直升机以燃油为动力，续航时间可达40分钟以上，载药量40L或更高，单架次作业面积远大于电动多旋翼。油动直升机飞行速度快，适合丘陵山地等复杂地形的长距离作业。但油动机型噪声大、振动强、维护要求高、运营成本较高，且需注意燃油安全与排放问题，不适合近距离居民区作业。',
    icon: 'Fuel',
    relatedEntries: ['drone-rotor', 'str-takeoff'],
  },
  {
    id: 'drone-battery',
    category: 'drone',
    title: '电池续航规划',
    content:
      '电动多旋翼植保无人机的续航时间是作业效率的关键瓶颈。实际续航受载药量、飞行高度、风速、气温等多因素影响，通常为标称续航的70%-85%。规划航线时应预留20%以上的电量安全余量用于返航，避免电量耗尽导致迫降。多组电池轮换使用是提升连续作业效率的核心策略，建议至少配备3-4组电池循环使用。',
    icon: 'Battery',
    relatedEntries: ['drone-rotor', 'str-takeoff', 'weather-heat'],
  },
];
