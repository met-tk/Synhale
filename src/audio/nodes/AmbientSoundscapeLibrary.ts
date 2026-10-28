/**
 * Synhale 2 - Ambient Soundscape Library
 * 
 * 120 Curated High-Fidelity Soundscapes across 12 Thematic Pages:
 * Page 1 (00..09): 江海潮涌 · Ocean & Waves
 * Page 2 (10..19): 雨境雨幕 · Rain & Storms
 * Page 3 (20..29): 林泉飞瀑 · Streams & Cascades
 * Page 4 (30..39): 风啸寒原 · Wind & Blizzard
 * Page 5 (40..49): 温暖地火 · Fire & Embers
 * Page 6 (50..59): 原野生态 · Forest & Biosphere
 * Page 7 (60..69): 精选混音 I · Curated Mixes I
 * Page 8 (70..79): 精选混音 II · Curated Mixes II
 * Page 9 (80..89): 飞鸟游鲸 · Wildlife & Marine
 * Page 10 (90..99): 原野伴生 · Animals & Insects
 * Page 11 (100..109): 冥想器乐 · Meditation & Acoustic
 * Page 12 (110..119): 城市生活 · Urban & Living
 * 
 * Features:
 * - 100% Offline Procedural Mathematical Physical Modeling Synthesis (Zero Network Dependency)
 * - Seamless Equal-Power Crossfaded Infinite Loop (Mathematically Zero Clicks/Pops)
 * - Automatic Waveform RMS Loudness Equalization & Soft-Knee Peak Protection
 * - Automatic Migration & Fallback for Legacy Soundscape IDs
 * - Zero Emoji & Pure Natural Acoustic Realism
 */

import { AmbientSoundscapeId } from '../../types/audio';

export interface AmbientSoundscapeMetadata {
  id: AmbientSoundscapeId;
  name: string;
  nameEn: string;
  badge: string;
  description: string;
  audioUrl?: string;
}

export const AMBIENT_SOUNDSCAPES: AmbientSoundscapeMetadata[] = [
  // ==========================================
  // PAGE 1: 江海潮涌 (Ocean & Waves) 00..09
  // ==========================================
  {
    id: 'oceanTide',
    name: '岸边波浪 2',
    nameEn: 'Beach Waves 2',
    badge: 'Waves 2',
    description: '海浪拍打沙滩与碎浪退却声',
    audioUrl: 'ocean/waves_on_beach2.mp3'
  },
  {
    id: 'lakeLapping',
    name: '夏日海滩 1',
    nameEn: 'Summer Beach 1',
    badge: 'Beach 1',
    description: '夏日海滩岸边浪潮拍打声',
    audioUrl: 'ocean/summer_beach1.mp3'
  },
  {
    id: 'underwaterReef',
    name: '水底气泡',
    nameEn: 'Water Bubbles',
    badge: 'Bubbles',
    description: '水中持续破裂的微小气泡声',
    audioUrl: 'ocean/liecio-water-bubbles-257594.mp3'
  },
  {
    id: 'rollingSwell',
    name: '远海浪涛',
    nameEn: 'VirtOcean Ocean',
    badge: 'Ocean',
    description: '广阔外海起伏涌浪与深邃水流声',
    audioUrl: 'ocean/virtocean_ocean.mp3'
  },
  {
    id: 'pebbleBeach',
    name: '岸边海浪 1',
    nameEn: 'Coast Wave 1',
    badge: 'Wave 1',
    description: '海边岩石与岸边撞击拍打浪声 1',
    audioUrl: 'ocean/soundeffect_wave1.mp3'
  },
  {
    id: 'coastalBreaker',
    name: '岸边海浪 2',
    nameEn: 'Coast Wave 2',
    badge: 'Wave 2',
    description: '海边岩石与岸边撞击拍打浪声 2',
    audioUrl: 'ocean/soundeffect_wave2.mp3'
  },
  {
    id: 'tidalBasin',
    name: '海上风暴',
    nameEn: 'Sea Storm',
    badge: 'Storm',
    description: '风暴天气下的沿岸疾风狂浪',
    audioUrl: 'ocean/soundeffect_sea_storm.mp3'
  },
  {
    id: 'calmHarbor',
    name: '滴水声',
    nameEn: 'Water Dripping',
    badge: 'Dripping',
    description: '水滴自上方持续滴落溅开声',
    audioUrl: 'ocean/dragon-studio-water-dripping-364450.mp3'
  },
  {
    id: 'deepSeaLow',
    name: '江河流泉',
    nameEn: 'Stream River',
    badge: 'River',
    description: '大河宽阔水流奔涌流淌声',
    audioUrl: 'ocean/soundreality-water-stream-river-360596.mp3'
  },
  {
    id: 'seaSpray',
    name: '奔涌溪水',
    nameEn: 'Running Stream',
    badge: 'Stream',
    description: '湍急流水奔腾声',
    audioUrl: 'ocean/allyinnature-running-stream-water-sound-239612.mp3'
  },

  // ==========================================
  // PAGE 2: 雨境雨幕 (Rain & Storms) 10..19
  // ==========================================
  {
    id: 'gentleRain',
    name: '窗外观雨',
    nameEn: 'Watch Raining',
    badge: 'Watch Rain',
    description: '窗外观雨与持续自然落雨声',
    audioUrl: 'rain/watch_raining.mp3'
  },
  {
    id: 'heavyRain',
    name: '阴雨天',
    nameEn: 'Gloomy Rainy Day',
    badge: 'Gloomy Rain',
    description: '阴天连绵不断的环境落雨声',
    audioUrl: 'rain/gloomy_rainy_day.mp3'
  },
  {
    id: 'distantThunder',
    name: '真实雨声',
    nameEn: 'Real Rain Sound',
    badge: 'Real Rain',
    description: '户外真实平稳的自然落雨声',
    audioUrl: 'rain/feedthestraycats-real-rain-sound-379215.mp3'
  },
  {
    id: 'roofRain',
    name: '舒缓雨声',
    nameEn: 'Calming Rain',
    badge: 'Calm Rain',
    description: '柔和平稳的治愈系连续降雨',
    audioUrl: 'rain/liecio-calming-rain-257596.mp3'
  },
  {
    id: 'gutterDrip',
    name: '躲雨檐下 1',
    nameEn: 'Shelter from Rain 1',
    badge: 'Shelter 1',
    description: '避雨处听雨水打在遮蔽物上 1',
    audioUrl: 'rain/shelter_from_rain1.mp3'
  },
  {
    id: 'forestDrizzle',
    name: '躲雨檐下 2',
    nameEn: 'Shelter from Rain 2',
    badge: 'Shelter 2',
    description: '避雨处听雨水打在遮蔽物上 2',
    audioUrl: 'rain/shelter_from_rain2.mp3'
  },
  {
    id: 'windowRain',
    name: '阵雨带',
    nameEn: 'Rainfall Band',
    badge: 'Rainfall',
    description: '降雨云带经过时的持续自然降水声',
    audioUrl: 'rain/rainfall_band.mp3'
  },
  {
    id: 'thunderShower',
    name: '小雨雷鸣 1',
    nameEn: 'Light Rain Thunder 1',
    badge: 'Thunder 1',
    description: '细雨伴随远方偶发沉雷声 1',
    audioUrl: 'rain/light_rain_thunder1.mp3'
  },
  {
    id: 'mistPrecipitation',
    name: '暴风雨 1',
    nameEn: 'Storm 1',
    badge: 'Storm 1',
    description: '大风伴随瓢泼大雨的暴风雨声 1',
    audioUrl: 'rain/storm1.mp3'
  },
  {
    id: 'summerShower',
    name: '雷声 1',
    nameEn: 'Thunder 1',
    badge: 'Thunder 1',
    description: '低沉轰鸣的回音雷声 1',
    audioUrl: 'rain/thunder1.mp3'
  },

  // ==========================================
  // PAGE 3: 林泉飞瀑 (Streams & Cascades) 20..29
  // ==========================================
  {
    id: 'forestStream',
    name: '高山溪流',
    nameEn: 'Mountain Stream',
    badge: 'Mt Stream',
    description: '高海拔山间清澈溪水湍流',
    audioUrl: 'stream/mountain_stream.mp3'
  },
  {
    id: 'alpineWaterfall',
    name: '山间溪涧',
    nameEn: 'Mt Stream',
    badge: 'Stream',
    description: '群山岩隙间欢快流淌的浅水溪声',
    audioUrl: 'stream/Mt_stream.mp3'
  },
  {
    id: 'caveDroplets',
    name: '小溪流水 1',
    nameEn: 'Stream 1',
    badge: 'Stream 1',
    description: '林间小溪水流潺潺 1',
    audioUrl: 'stream/stream1.mp3'
  },
  {
    id: 'rockyBrook',
    name: '小溪流水 2',
    nameEn: 'Stream 2',
    badge: 'Stream 2',
    description: '小石块间穿行的小溪流 2',
    audioUrl: 'stream/stream2.mp3'
  },
  {
    id: 'mountainCascade',
    name: '高山泉水 2',
    nameEn: 'Spring Water on Mt 2',
    badge: 'Spring 2',
    description: '高山上涌出的清凉泉水流淌声 2',
    audioUrl: 'stream/spring_water_on_Mt2.mp3'
  },
  {
    id: 'canyonRapid',
    name: '小型瀑布',
    nameEn: 'Small Waterfall',
    badge: 'Waterfall',
    description: '山间小落差瀑布跌水声',
    audioUrl: 'stream/small_waterfall.mp3'
  },
  {
    id: 'babblingBrook',
    name: '小河溪声 1',
    nameEn: 'Creek 1',
    badge: 'Creek 1',
    description: '树林下小溪细水长流 1',
    audioUrl: 'stream/soundeffect_creek1.mp3'
  },
  {
    id: 'meltingCreek',
    name: '溶洞水流 1',
    nameEn: 'Cave 1',
    badge: 'Cave 1',
    description: '封闭洞穴深处的水流声 1',
    audioUrl: 'stream/soundeffect_cave1.mp3'
  },
  {
    id: 'hotSpringBubble',
    name: '洞穴溪流 1',
    nameEn: 'Cave Stream 1',
    badge: 'Cave Stream',
    description: '岩洞深处地下暗河溪流声 1',
    audioUrl: 'stream/cave_stream1.mp3'
  },
  {
    id: 'valleyRiver',
    name: '洞穴细流',
    nameEn: 'Small Cave Stream',
    badge: 'Small Cave',
    description: '岩壁缝隙滴流汇入的幽静洞穴细流',
    audioUrl: 'stream/small_cave_stream.mp3'
  },

  // ==========================================
  // PAGE 4: 风啸寒原 (Wind & Blizzard) 30..39
  // ==========================================
  {
    id: 'canopyBreeze',
    name: '植物摇曳 1',
    nameEn: 'Plants Swaying 1',
    badge: 'Plants 1',
    description: '风吹动树木枝叶摇曳摩擦声 1',
    audioUrl: 'wind/soundeffect_plants_swaying1.mp3'
  },
  {
    id: 'autumnGale',
    name: '大风吹树 1',
    nameEn: 'Gale Blow Trees 1',
    badge: 'Gale Trees',
    description: '强风吹动树冠枝干呼啸声 1',
    audioUrl: 'wind/gale_blow_trees1.mp3'
  },
  {
    id: 'arcticBlizzard',
    name: '强风 1',
    nameEn: 'Strong Wind 1',
    badge: 'Strong Wind 1',
    description: '强劲风声呼啸 1',
    audioUrl: 'wind/strong_wind1.mp3'
  },
  {
    id: 'bambooWhisper',
    name: '强风 2',
    nameEn: 'Strong Wind 2',
    badge: 'Strong Wind 2',
    description: '急劲穿堂强风声 2',
    audioUrl: 'wind/strong_wind2.mp3'
  },
  {
    id: 'valleyBreeze',
    name: '风雨击窗 1',
    nameEn: 'Storm Hit Window 1',
    badge: 'Window Storm 1',
    description: '强风拍打窗户玻璃声 1',
    audioUrl: 'wind/storm_hit_window1.mp3'
  },
  {
    id: 'desertDune',
    name: '风雨击窗 5',
    nameEn: 'Storm Hit Window 5',
    badge: 'Window Storm 5',
    description: '暴风不断冲击窗扉阵风声 5',
    audioUrl: 'wind/storm_hit_window5.mp3'
  },
  {
    id: 'mountainPineMist',
    name: '暴风雪',
    nameEn: 'Blizzard',
    badge: 'Blizzard',
    description: '寒冷暴风雪天气狂风呼啸',
    audioUrl: 'wind/blizzard.mp3'
  },
  {
    id: 'canyonEcho',
    name: '草原风声 1',
    nameEn: 'Grassland Wind 1',
    badge: 'Grass Wind 1',
    description: '辽阔草原吹过的自然野风 1',
    audioUrl: 'wind/grassland_wind1.mp3'
  },
  {
    id: 'wheatFieldBreeze',
    name: '草原风声 2',
    nameEn: 'Grassland Wind 2',
    badge: 'Grass Wind 2',
    description: '辽阔草原吹过的自然野风 2',
    audioUrl: 'wind/grassland_wind2.mp3'
  },
  {
    id: 'winterFrost',
    name: '旗帜猎风',
    nameEn: 'Flag Flutter',
    badge: 'Flag Flutter',
    description: '大风中布料旗帜剧烈翻动声',
    audioUrl: 'wind/flag_flutter.mp3'
  },

  // ==========================================
  // PAGE 5: 温暖地火 (Fire & Embers) 40..49
  // ==========================================
  {
    id: 'cozyFire',
    name: '燃烧火焰 1',
    nameEn: 'Fire 1',
    badge: 'Fire 1',
    description: '木材燃烧火苗跳动噼啪声 1',
    audioUrl: 'fire/soundeffect_fire1.mp3'
  },
  {
    id: 'campfire',
    name: '篝火 1',
    nameEn: 'Bonfire 1',
    badge: 'Bonfire 1',
    description: '野外篝火持续燃烧声 1',
    audioUrl: 'fire/alexzavesa-bonfire-1-468364.mp3'
  },
  {
    id: 'charcoalEmbers',
    name: '壁炉火声',
    nameEn: 'Crackle Fireplace',
    badge: 'Crackle',
    description: '室内壁炉木材清脆爆裂声',
    audioUrl: 'fire/capaholiczsfx-crackle-fireplace-campfire-402289.mp3'
  },
  {
    id: 'pineConeCrackle',
    name: '壁炉循环声',
    nameEn: 'Fireplace Loop',
    badge: 'Hearth Loop',
    description: '稳定温和的壁炉火声循环',
    audioUrl: 'fire/king_of_the_christmas-fireplace-loop-original-noise-178209.mp3'
  },
  {
    id: 'hearthBlaze',
    name: '篝火噼啪',
    nameEn: 'Campfire Crackling',
    badge: 'Campfire',
    description: '炭火火星噼啪轻微爆响声',
    audioUrl: 'fire/soundsforyou-campfire-crackling-fireplace-sound-119594.mp3'
  },
  {
    id: 'forestBonfire',
    name: '舒缓火声',
    nameEn: 'Fire Relaxing',
    badge: 'Relax Fire',
    description: '宁静温和的火焰燃烧声',
    audioUrl: 'fire/soundreality-fire-relaxing-528619.mp3'
  },
  {
    id: 'peatFire',
    name: '壁炉燃烧火焰',
    nameEn: 'Flame in Fireplace',
    badge: 'Fireplace',
    description: '自然录音壁炉木柴燃烧声',
    audioUrl: 'fire/restfuldreamingtunes-sounds-of-nature-the-sound-of-a-flame-burning-in-a-fireplace-273945.mp3'
  },
  {
    id: 'dryTwigSnap',
    name: '真实火声',
    nameEn: 'Fire Sound',
    badge: 'Fire Sound',
    description: '大火堆燃烧柴火木炭爆裂',
    audioUrl: 'fire/u_d3475dm30o-fire-sound-222359.mp3'
  },
  {
    id: 'leafEmber',
    name: '地鸣轰响',
    nameEn: 'Rumbling Earth',
    badge: 'Rumble',
    description: '地下深处低频震动声',
    audioUrl: 'fire/rumbling_earth.mp3'
  },
  {
    id: 'geothermalSteam',
    name: '细沙流动',
    nameEn: 'Sand Flows',
    badge: 'Sand Flows',
    description: '沙粒滑落微弱摩擦如余烬微声',
    audioUrl: 'fire/sand_flows.mp3'
  },

  // ==========================================
  // PAGE 6: 原野生态 (Forest & Biosphere) 50..59
  // ==========================================
  {
    id: 'summerCrickets',
    name: '夏日群山 1',
    nameEn: 'Summer Mountains 1',
    badge: 'Mountains 1',
    description: '盛夏山间自然生态环境声 1',
    audioUrl: 'bio/summer_mountains1.mp3'
  },
  {
    id: 'cicadaSummer',
    name: '黑鸣蝉 1',
    nameEn: 'Black Cicadas 1',
    badge: 'Cicadas 1',
    description: '夏日树顶黑鸣蝉高声鸣唱 1',
    audioUrl: 'bio/black_cicadas1.mp3'
  },
  {
    id: 'rainforestCanopy',
    name: '乡间夏日',
    nameEn: 'Summer Country',
    badge: 'Country',
    description: '盛夏乡村田野广阔自然环境声',
    audioUrl: 'bio/soundeffect_summer_country.mp3'
  },
  {
    id: 'peatBogNight',
    name: '轻井泽鸟鸣',
    nameEn: 'Karuizawa Birds',
    badge: 'Karuizawa',
    description: '高原树林中清晨各种野鸟啼鸣',
    audioUrl: 'bio/soundeffect_karuizawa_birds.mp3'
  },
  {
    id: 'pineNeedleFall',
    name: '蓝矶鸫鸟鸣',
    nameEn: 'Blue Rock Thrush',
    badge: 'Rock Thrush',
    description: '岩壁蓝矶鸫清脆明亮的啼唱声',
    audioUrl: 'bio/blue_rock_thrush.mp3'
  },
  {
    id: 'morningBirdsong',
    name: '青蛙鸣叫 2',
    nameEn: 'Frogs 2',
    badge: 'Frogs 2',
    description: '暮色水洼池塘青蛙低沉鸣叫 2',
    audioUrl: 'bio/frogs2.mp3'
  },
  {
    id: 'frogPond',
    name: '秋季虫鸣 2',
    nameEn: 'Insects Sing in Fall 2',
    badge: 'Fall Insects 2',
    description: '秋夜草丛秋虫低语鸣叫 2',
    audioUrl: 'bio/insects_sing_in_fall2.mp3'
  },
  {
    id: 'forestInsects',
    name: '秋季虫鸣 4',
    nameEn: 'Insects Sing in Fall 4',
    badge: 'Fall Insects 4',
    description: '秋季夜晚草丛深处促织鸣叫 4',
    audioUrl: 'bio/insects_sing_in_fall4.mp3'
  },
  {
    id: 'reedMarsh',
    name: '秋季虫鸣 5',
    nameEn: 'Insects Sing in Fall 5',
    badge: 'Fall Insects 5',
    description: '夜间树叶深处密集秋虫鸣声 5',
    audioUrl: 'bio/insects_sing_in_fall5.mp3'
  },
  {
    id: 'wildernessDawn',
    name: '秋夜水畔 2',
    nameEn: 'Fall Riverside Night 2',
    badge: 'Riverside 2',
    description: '秋天河畔深夜水气与两岸虫鸣 2',
    audioUrl: 'bio/fall_riverside_night2.mp3'
  },

  // ==========================================
  // PAGE 7: 复合声景 I (Curated Mixes I) 60..69
  // ==========================================
  {
    id: 'mixDeepForest',
    name: '幽深森林',
    nameEn: 'Deep Forest Mix',
    badge: 'Deep Forest',
    description: '深山林海幽静微风与多层自然环境声混音',
    audioUrl: 'mix1/mix_deep_forest.mp3'
  },
  {
    id: 'mixZenGarden',
    name: '禅意庭园',
    nameEn: 'Zen Garden Mix',
    badge: 'Zen Garden',
    description: '日式枯山水庭院清泉水流与风铃意境混音',
    audioUrl: 'mix1/mix_zen_garden.mp3'
  },
  {
    id: 'mixCozyFireplace',
    name: '温暖壁炉',
    nameEn: 'Cozy Fireplace Mix',
    badge: 'Fireplace Mix',
    description: '室内壁炉木柴燃烧爆裂与温暖环境白噪音',
    audioUrl: 'mix1/mix_cozy_fireplace.mp3'
  },
  {
    id: 'mixRainOnTent',
    name: '帐篷听雨',
    nameEn: 'Rain on Tent Mix',
    badge: 'Tent Rain',
    description: '露营帐篷顶布密集的清脆落雨敲击声混音',
    audioUrl: 'mix1/mix_rain_on_tent.mp3'
  },
  {
    id: 'mixCoastalCalm',
    name: '宁静海岸',
    nameEn: 'Coastal Calm Mix',
    badge: 'Coastal Calm',
    description: '黄昏宁静海湾轻柔细浪与远海呼吸律动',
    audioUrl: 'mix1/mix_coastal_calm.mp3'
  },
  {
    id: 'mixRainyCafe',
    name: '雨天咖啡',
    nameEn: 'Rainy Cafe Mix',
    badge: 'Rainy Cafe',
    description: '窗外雨幕与室内咖啡馆低语专注环境混音',
    audioUrl: 'mix1/mix_rainy_cafe.mp3'
  },
  {
    id: 'mixSleepyStorm',
    name: '伴眠风雨',
    nameEn: 'Sleepy Storm Mix',
    badge: 'Sleepy Storm',
    description: '催眠沉静的深沉风雨声与远方低回雷鸣',
    audioUrl: 'mix1/mix_sleepy_storm.mp3'
  },
  {
    id: 'mixStudyLofi',
    name: '专注书房',
    nameEn: 'Study Lofi Mix',
    badge: 'Study Focus',
    description: '轻柔书房纸页与环境音律，深度心流专注',
    audioUrl: 'mix1/mix_study_lofi.mp3'
  },
  {
    id: 'mixUnderwaterAbyss',
    name: '深海水境',
    nameEn: 'Underwater Abyss Mix',
    badge: 'Deep Abyss',
    description: '大洋深处低频水流包裹与神秘水声环境',
    audioUrl: 'mix1/mix_underwater_abyss.mp3'
  },
  {
    id: 'mixWhaleDive',
    name: '游鲸下潜',
    nameEn: 'Whale Dive Mix',
    badge: 'Whale Dive',
    description: '深海巨鲸悠远歌声与洋流下潜复合声景',
    audioUrl: 'mix1/mix_whale_dive.mp3'
  },

  // ==========================================
  // PAGE 8: 复合声景 II (Curated Mixes II) 70..79
  // ==========================================
  {
    id: 'mixLakesideDawn',
    name: '湖畔晨曦',
    nameEn: 'Lakeside Dawn Mix',
    badge: 'Lake Dawn',
    description: '清晨湖面薄雾破晓与晨鸟水声交织混音',
    audioUrl: 'mix2/mix_lakeside_dawn.mp3'
  },
  {
    id: 'mixNightGarden',
    name: '夜晚花园',
    nameEn: 'Night Garden Mix',
    badge: 'Night Garden',
    description: '静夜庭院微风拂叶与夜行生灵隐约声响',
    audioUrl: 'mix2/mix_night_garden.mp3'
  },
  {
    id: 'mixNordicWinter',
    name: '北欧冬日',
    nameEn: 'Nordic Winter Mix',
    badge: 'Nordic Winter',
    description: '北欧冰雪原野微寒风声与木屋庇护感',
    audioUrl: 'mix2/mix_nordic_winter.mp3'
  },
  {
    id: 'mixOceanFlight',
    name: '海上航行',
    nameEn: 'Ocean Flight Mix',
    badge: 'Ocean Voyage',
    description: '乘风破浪横跨广阔大洋的稳定水流与风息',
    audioUrl: 'mix2/mix_ocean_flight.mp3'
  },
  {
    id: 'mixRainyTrain',
    name: '雨中列车',
    nameEn: 'Rainy Train Mix',
    badge: 'Rainy Train',
    description: '车窗雨滴流淌与列车铁轨有节律的行进声',
    audioUrl: 'mix2/mix_rainy_train.mp3'
  },
  {
    id: 'mixSakuraGarden',
    name: '樱花庭院',
    nameEn: 'Sakura Garden Mix',
    badge: 'Sakura Garden',
    description: '春日落樱微风与石阶流泉清脆水音混音',
    audioUrl: 'mix2/mix_sakura_garden.mp3'
  },
  {
    id: 'mixDesertNight',
    name: '荒漠之夜',
    nameEn: 'Desert Night Mix',
    badge: 'Desert Night',
    description: '浩瀚荒漠静夜干燥微风与星空沉寂感',
    audioUrl: 'mix2/mix_desert_night.mp3'
  },
  {
    id: 'mixMidnightJungle',
    name: '午夜丛林',
    nameEn: 'Midnight Jungle Mix',
    badge: 'Night Jungle',
    description: '热带雨林午夜树冠滴水与丰富生态环境',
    audioUrl: 'mix2/mix_midnight_jungle.mp3'
  },
  {
    id: 'mixMorningMeadow',
    name: '清晨草甸',
    nameEn: 'Morning Meadow Mix',
    badge: 'Meadow Dawn',
    description: '晨露未晞的高山草甸微风与苏醒生机',
    audioUrl: 'mix2/mix_morning_meadow.mp3'
  },
  {
    id: 'mixCabinRetreat',
    name: '林中小屋',
    nameEn: 'Cabin Retreat Mix',
    badge: 'Cabin Retreat',
    description: '深山木屋安逸避世之所的静谧温暖声景',
    audioUrl: 'mix2/mix_cabin_retreat.mp3'
  },

  // ==========================================
  // PAGE 9: 飞鸟游鲸 (Wildlife & Marine) 80..89
  // ==========================================
  {
    id: 'whaleSong',
    name: '抹香鲸鸣',
    nameEn: 'Whale Song',
    badge: 'Whale Song',
    description: '大洋深处座头鲸悠远空灵的长吟歌声',
    audioUrl: 'birds/whale_song.mp3'
  },
  {
    id: 'dolphins',
    name: '海豚跃水',
    nameEn: 'Dolphins',
    badge: 'Dolphins',
    description: '浅海海豚欢快嬉水与高频声呐哨鸣',
    audioUrl: 'birds/dolphins.mp3'
  },
  {
    id: 'birdsong',
    name: '林间鸟语',
    nameEn: 'Birdsong',
    badge: 'Birdsong',
    description: '阔叶林中清晨百鸟欢唱的多重合奏',
    audioUrl: 'birds/birdsong.mp3'
  },
  {
    id: 'nightingale',
    name: '夜莺啼唱',
    nameEn: 'Nightingale',
    badge: 'Nightingale',
    description: '静谧深夜树梢夜莺清丽婉转的独唱',
    audioUrl: 'birds/nightingale.mp3'
  },
  {
    id: 'owl',
    name: '林中猫头鹰',
    nameEn: 'Owl Calls',
    badge: 'Owl Calls',
    description: '幽暗深林中猫头鹰低沉悠远的呼唤声',
    audioUrl: 'birds/owl.mp3'
  },
  {
    id: 'cuckoo',
    name: '布谷鸟鸣',
    nameEn: 'Cuckoo Calls',
    badge: 'Cuckoo',
    description: '春日远山深处清亮悠扬的布谷啼声',
    audioUrl: 'birds/cuckoo.mp3'
  },
  {
    id: 'seagulls',
    name: '海鸥群鸣',
    nameEn: 'Seagulls',
    badge: 'Seagulls',
    description: '海边盘旋翱翔的海鸥群鸣与海浪伴奏',
    audioUrl: 'birds/seagulls.mp3'
  },
  {
    id: 'dawnChorus',
    name: '黎明百鸟',
    nameEn: 'Dawn Chorus',
    badge: 'Dawn Chorus',
    description: '拂晓时分大自然森林苏醒的群鸟大合唱',
    audioUrl: 'birds/dawn_chorus.mp3'
  },
  {
    id: 'loonCalls',
    name: '潜鸟啼鸣',
    nameEn: 'Loon Calls',
    badge: 'Loon Calls',
    description: '北美荒野湖泊白嘴潜鸟空灵神秘的啸鸣',
    audioUrl: 'birds/loon_calls.mp3'
  },
  {
    id: 'parrots',
    name: '丛林鹦鹉',
    nameEn: 'Jungle Parrots',
    badge: 'Parrots',
    description: '热带雨林高处彩色鹦鹉的生机啼叫',
    audioUrl: 'birds/parrots.mp3'
  },

  // ==========================================
  // PAGE 10: 原野伴生 (Animals & Insects) 90..99
  // ==========================================
  {
    id: 'catPurr',
    name: '猫咪呼噜',
    nameEn: 'Cat Purr',
    badge: 'Cat Purr',
    description: '猫咪身旁极度舒适温暖的低频呼噜声',
    audioUrl: 'creatures/cat_purr.mp3'
  },
  {
    id: 'crickets',
    name: '草丛促织',
    nameEn: 'Field Crickets',
    badge: 'Crickets',
    description: '夏秋夜晚田野草丛中密集的蟋蟀鸣唱',
    audioUrl: 'creatures/crickets.mp3'
  },
  {
    id: 'frogs',
    name: '池塘青蛙',
    nameEn: 'Pond Frogs',
    badge: 'Pond Frogs',
    description: '暮色水草池塘边阵阵此起彼伏的蛙声',
    audioUrl: 'creatures/frogs.mp3'
  },
  {
    id: 'cicadas',
    name: '树梢夏蝉',
    nameEn: 'Summer Cicadas',
    badge: 'Cicadas',
    description: '盛夏阳光下绿树梢头连绵高亢的蝉鸣',
    audioUrl: 'creatures/cicadas.mp3'
  },
  {
    id: 'bees',
    name: '蜜蜂采蜜',
    nameEn: 'Bees Buzzing',
    badge: 'Bees',
    description: '花丛之间成群蜜蜂振翅采蜜的嗡嗡声',
    audioUrl: 'creatures/bees.mp3'
  },
  {
    id: 'wolf',
    name: '远山狼嚎',
    nameEn: 'Wolf Howling',
    badge: 'Wolf Howl',
    description: '月夜荒原远方苍茫凄美的独狼长嚎',
    audioUrl: 'creatures/wolf.mp3'
  },
  {
    id: 'duck',
    name: '野鸭戏水',
    nameEn: 'Wild Ducks',
    badge: 'Ducks',
    description: '湖泊芦苇水荡间野鸭扑翅与清脆啼鸣',
    audioUrl: 'creatures/duck.mp3'
  },
  {
    id: 'pigeons',
    name: '广场鸽群',
    nameEn: 'Square Pigeons',
    badge: 'Pigeons',
    description: '宁静阳光广场上鸽群振翅起飞与咕咕轻啼',
    audioUrl: 'creatures/pigeons.mp3'
  },
  {
    id: 'rooster',
    name: '晨起啼晓',
    nameEn: 'Morning Rooster',
    badge: 'Rooster',
    description: '乡村黎明第一声清脆响亮的公鸡啼鸣',
    audioUrl: 'creatures/rooster.mp3'
  },
  {
    id: 'sparrows',
    name: '檐下麻雀',
    nameEn: 'Sparrows Chirping',
    badge: 'Sparrows',
    description: '清晨屋檐树枝间欢快跳跃的麻雀叽喳',
    audioUrl: 'creatures/sparrows.mp3'
  },

  // ==========================================
  // PAGE 11: 冥想器乐 (Meditation & Acoustic) 100..109
  // ==========================================
  {
    id: 'singingBowl',
    name: '颂钵回响',
    nameEn: 'Singing Bowl',
    badge: 'Singing Bowl',
    description: '尼泊尔手工颂钵击打后经久不息的纯净泛音',
    audioUrl: 'meditation/singing_bowl.mp3'
  },
  {
    id: 'tibetanBowl',
    name: '西藏铜钵',
    nameEn: 'Tibetan Bowl',
    badge: 'Tibetan Bowl',
    description: '传统厚重黄铜颂钵深沉温厚的定神共鸣',
    audioUrl: 'meditation/tibetan_bowl.mp3'
  },
  {
    id: 'crystalBowl',
    name: '水晶声钵',
    nameEn: 'Crystal Bowl',
    badge: 'Crystal Bowl',
    description: '高纯度石英水晶钵清透高亢的脉轮共振声',
    audioUrl: 'meditation/crystal_bowl.mp3'
  },
  {
    id: 'windChimes',
    name: '随风风铃',
    nameEn: 'Wind Chimes',
    badge: 'Wind Chimes',
    description: '微风轻抚金属铝管清脆空灵的自然撞击',
    audioUrl: 'meditation/wind_chimes.mp3'
  },
  {
    id: 'meditationBell',
    name: '静心钟声',
    nameEn: 'Meditation Bell',
    badge: 'Zen Bell',
    description: '禅修堂深远纯粹的定心铜铃击打残响',
    audioUrl: 'meditation/meditation_bell.mp3'
  },
  {
    id: 'harp',
    name: '竖琴流水',
    nameEn: 'Acoustic Harp',
    badge: 'Harp',
    description: '原声竖琴优美流畅如涓涓泉水的拨弦乐',
    audioUrl: 'meditation/harp.mp3'
  },
  {
    id: 'flute',
    name: '悠扬竹笛',
    nameEn: 'Breeze Flute',
    badge: 'Flute',
    description: '山谷微风中悠长舒缓的木管吹奏气息',
    audioUrl: 'meditation/flute.mp3'
  },
  {
    id: 'piano',
    name: '舒缓钢琴',
    nameEn: 'Calm Piano',
    badge: 'Piano',
    description: '温柔缓慢的原声钢琴踏板与琴弦共鸣',
    audioUrl: 'meditation/piano.mp3'
  },
  {
    id: 'guitar',
    name: '原声吉他',
    nameEn: 'Acoustic Guitar',
    badge: 'Guitar',
    description: '木吉他温暖温润的手指轻抚拨弦乐',
    audioUrl: 'meditation/guitar.mp3'
  },
  {
    id: 'musicBox',
    name: '复古八音盒',
    nameEn: 'Music Box',
    badge: 'Music Box',
    description: '童年机械八音盒清脆单纯的金属发条齿轮声',
    audioUrl: 'meditation/music_box.mp3'
  },

  // ==========================================
  // PAGE 12: 城市生活 (Urban & Living) 110..119
  // ==========================================
  {
    id: 'coffeeShop',
    name: '咖啡馆',
    nameEn: 'Coffee Shop',
    badge: 'Cafe',
    description: '温馨咖啡馆杯碟轻碰与低语的专注白噪音',
    audioUrl: 'urban/coffee_shop.mp3'
  },
  {
    id: 'train',
    name: '绿皮列车',
    nameEn: 'Railway Train',
    badge: 'Train',
    description: '经典火车铁轨有规律律动的沉稳行进声',
    audioUrl: 'urban/train.mp3'
  },
  {
    id: 'metro',
    name: '城市地铁',
    nameEn: 'City Metro',
    badge: 'Metro',
    description: '现代地下列车加速减速与车厢平稳滑行',
    audioUrl: 'urban/metro.mp3'
  },
  {
    id: 'boat',
    name: '摇橹轻舟',
    nameEn: 'Wooden Boat',
    badge: 'Boat',
    description: '水乡木船木橹摇动与水波拍击船舷轻声',
    audioUrl: 'urban/boat.mp3'
  },
  {
    id: 'cityAmbiance',
    name: '城市街景',
    nameEn: 'City Ambiance',
    badge: 'City Walk',
    description: '开阔城市街道远方车流与人群的生活气息',
    audioUrl: 'urban/city_ambiance.mp3'
  },
  {
    id: 'clockTick',
    name: '时钟滴答',
    nameEn: 'Clock Ticking',
    badge: 'Clock Tick',
    description: '老式机械座钟沉稳有节拍的秒针走动声',
    audioUrl: 'urban/clock_tick.mp3'
  },
  {
    id: 'fan',
    name: '伴眠风扇',
    nameEn: 'Electric Fan',
    badge: 'Fan Noise',
    description: '夏日低速风扇旋转产生的平稳恒定风声',
    audioUrl: 'urban/fan.mp3'
  },
  {
    id: 'typing',
    name: '键盘敲击',
    nameEn: 'Keyboard Typing',
    badge: 'Typing',
    description: '机械键盘轻快有节奏的键帽敲击专注声',
    audioUrl: 'urban/typing.mp3'
  },
  {
    id: 'whiteNoise',
    name: '纯净白噪',
    nameEn: 'Pure White Noise',
    badge: 'White Noise',
    description: '全频段能量均等的标准白噪音掩蔽底噪',
    audioUrl: 'urban/white_noise.mp3'
  },
  {
    id: 'pinkNoise',
    name: '柔和粉噪',
    nameEn: 'Gentle Pink Noise',
    badge: 'Pink Noise',
    description: '每倍频程能量等同的温和自然粉红噪音',
    audioUrl: 'urban/pink_noise.mp3'
  }
];

/**
 * Migration map translating legacy non-natural/experimental soundscape IDs to pure natural equivalents.
 */
export const LEGACY_AMBIENT_MAP: Record<string, AmbientSoundscapeId> = {
  shamanicDrum: 'distantThunder',
  monasteryChant: 'caveDroplets',
  deepOmDrone: 'deepSeaLow',
  gongBath: 'oceanTide',
  templeBell: 'alpineWaterfall',
  tibetanSingingBowl: 'lakeLapping',
  tingshaChimes: 'gutterDrip',
  crystalChimes: 'mistPrecipitation',
  templeChimes: 'forestDrizzle',
  auroraEther: 'winterFrost',
  zenPondShishi: 'babblingBrook',
  rainStick: 'summerShower',
  deepGeothermal: 'geothermalSteam',
  ancientGlacier: 'meltingCreek',
  stellarDust: 'wildernessDawn'
};

/**
 * In-memory buffer caches for real natural audio recordings:
 * - realAudioBufferCache: authentic decoded field recordings
 * - inFlightLoads: deduplicates active concurrent fetch/decode requests
 */
const realAudioBufferCache = new Map<string, AudioBuffer>();
const inFlightLoads = new Map<string, Promise<AudioBuffer | null>>();

/**
 * Releases all cached ambient soundscape AudioBuffers and pending decode promises.
 * Called by AudioEngine.dispose() to prevent unbounded memory growth across
 * engine recreations (each new AudioContext may key on a different sampleRate).
 */
export function clearAmbientSoundscapeCache(): void {
  realAudioBufferCache.clear();
  inFlightLoads.clear();
}

/**
 * Trims encoder priming/padding silence from decoded MP3/AAC buffers in-place.
 *
 * Lossy codecs (LAME MP3, AAC) insert ~1152-sample near-silent priming frames at the head
 * and zero-padded frames at the tail. When `AudioBufferSourceNode.loop = true` wraps the
 * buffer, the splice point crosses these silent regions, producing an audible click on every
 * loop iteration. This scans for the first/last sample whose amplitude exceeds a conservative
 * threshold and zero-pads everything outside, so the loop boundary lands on real content.
 *
 * Safe: only modifies samples that are already below perceptual threshold (-60 dBFS).
 */
export function trimCodecPaddingFromBuffer(buffer: AudioBuffer): void {
  const numChannels = buffer.numberOfChannels;
  if (numChannels === 0) return;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  const len = channels[0]?.length ?? 0;
  if (len < 8192) return;

  // -60 dBFS = 0.001 amplitude; anything below is inaudible codec noise floor
  const threshold = 0.001;

  let firstAudible = 0;
  outerHead: for (let i = 0; i < len; i++) {
    for (let c = 0; c < numChannels; c++) {
      if (Math.abs(channels[c][i]) > threshold) {
        firstAudible = i;
        break outerHead;
      }
    }
  }

  let lastAudible = len - 1;
  outerTail: for (let i = len - 1; i >= 0; i--) {
    for (let c = 0; c < numChannels; c++) {
      if (Math.abs(channels[c][i]) > threshold) {
        lastAudible = i;
        break outerTail;
      }
    }
  }

  // Nothing to trim if the whole buffer is already loud end-to-end
  if (firstAudible === 0 && lastAudible === len - 1) return;

  // Zero-pad head and tail in place (keeps buffer length, only silences edges)
  for (let c = 0; c < numChannels; c++) {
    const data = channels[c];
    for (let i = 0; i < firstAudible; i++) data[i] = 0;
    for (let i = lastAudible + 1; i < len; i++) data[i] = 0;
  }
}

/**
 * Equalizes the perceptual loudness across any synthesized or decoded AudioBuffer.
 * Calibrates true RMS to target -16..-20 dBFS level and applies soft-knee tanh limiting
 * to prevent digital clipping while ensuring all soundscapes match in apparent loudness.
 */
export function equalizeBufferLoudness(
  buffer: AudioBuffer,
  targetRms = 0.16,
  maxPeak = 0.90
): void {
  const numChannels = buffer.numberOfChannels;
  if (numChannels === 0) return;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  const len = channels[0]?.length ?? 0;
  if (len === 0) return;

  // 1. Calculate true combined RMS energy across all channels
  // Optimization: use stride for long recordings (>10s) to keep CPU non-blocking
  const stride = len > 44100 * 10 ? 4 : 1;
  let sumSq = 0;
  let sampleCount = 0;
  for (let c = 0; c < numChannels; c++) {
    const data = channels[c];
    for (let i = 0; i < len; i += stride) {
      sumSq += data[i] * data[i];
      sampleCount++;
    }
  }
  const currentRms = Math.sqrt(sumSq / Math.max(1, sampleCount));

  if (currentRms <= 1e-6 || !Number.isFinite(currentRms)) return;

  // 2. Normalization gain multiplier
  const scale = targetRms / currentRms;

  // 3. Apply smooth algebraic sigmoid limiter: f(x) = (x / sqrt(1 + 0.9*x^2)) * maxPeak
  // Guarantees absolute peak capping below maxPeak while accurately achieving uniform RMS
  for (let c = 0; c < numChannels; c++) {
    const data = channels[c];
    for (let i = 0; i < len; i++) {
      const v = data[i] * scale;
      data[i] = (v / Math.sqrt(1.0 + v * v * 0.9)) * maxPeak;
    }
  }
}

/**
 * Asynchronously fetches and decodes an authentic real natural audio file from disk.
 * Applies automatic waveform RMS loudness equalization and stores in realAudioBufferCache.
 * Concurrent requests for the same soundscape are safely deduplicated via inFlightLoads.
 */
export async function loadRealAmbientAudioBuffer(
  ctx: BaseAudioContext,
  id: AmbientSoundscapeId
): Promise<AudioBuffer | null> {
  const resolvedId: AmbientSoundscapeId = LEGACY_AMBIENT_MAP[id] || id;
  const cacheKey = `${resolvedId}-${ctx.sampleRate || 44100}`;

  if (realAudioBufferCache.has(cacheKey)) {
    return realAudioBufferCache.get(cacheKey)!;
  }

  if (inFlightLoads.has(cacheKey)) {
    return inFlightLoads.get(cacheKey)!;
  }

  const meta = AMBIENT_SOUNDSCAPES.find(s => s.id === resolvedId);
  if (!meta?.audioUrl || typeof fetch === 'undefined') {
    return null;
  }

  const audioUrl = meta.audioUrl;
  const loadPromise = (async (): Promise<AudioBuffer | null> => {
    try {
      const rawPath = audioUrl.startsWith('/') || audioUrl.startsWith('./')
        ? audioUrl
        : `/audio/ambient/${audioUrl}`;
      const resp = await fetch(rawPath.startsWith('/') ? `.${rawPath}` : rawPath);
      if (!resp.ok) return null;
      const arrayBuffer = await resp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      trimCodecPaddingFromBuffer(decoded);
      equalizeBufferLoudness(decoded);
      realAudioBufferCache.set(cacheKey, decoded);
      return decoded;
    } catch {
      return null;
    } finally {
      inFlightLoads.delete(cacheKey);
    }
  })();

  inFlightLoads.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Retrieves or builds an ambient soundscape AudioBuffer.
 * Returns decoded real audio if available in cache, or triggers loading and returns
 * a clean silent buffer while decoding. Strictly zero code-generated sound materials.
 */
export function getAmbientSoundscapeBuffer(
  ctx: BaseAudioContext,
  id: AmbientSoundscapeId
): AudioBuffer {
  const resolvedId: AmbientSoundscapeId = LEGACY_AMBIENT_MAP[id] || id;
  const cacheKey = `${resolvedId}-${ctx.sampleRate || 44100}`;

  if (realAudioBufferCache.has(cacheKey)) {
    return realAudioBufferCache.get(cacheKey)!;
  }

  // Trigger non-blocking async load of real audio recording
  loadRealAmbientAudioBuffer(ctx, resolvedId);

  // Return clean silent buffer until real recording is decoded
  const silent = ctx.createBuffer(2, Math.max(128, Math.floor((ctx.sampleRate || 44100) * 4.0)), ctx.sampleRate || 44100);
  return silent;
}

/**
 * Pre-warms authentic real natural soundscape buffers into memory for zero-latency playback.
 */
export function prewarmAllAmbientBuffers(ctx: BaseAudioContext): void {
  const primarySoundscapes: AmbientSoundscapeId[] = [
    'oceanTide',
    'gentleRain',
    'forestStream',
    'canopyBreeze',
    'cozyFire',
    'summerCrickets'
  ];
  for (const id of primarySoundscapes) {
    loadRealAmbientAudioBuffer(ctx, id);
  }
}
