# RepoPulse — 220 inkişaf ideyası və icra planı

Tarix: 17 noyabr 2026. **Bu sənəddəki 220 maddə gələcək planıdır; hazır 220 funksiya iddiası deyil.** Hər maddənin ilkin statusu “Planlaşdırılır”. Yalnız kod, qəbul sübutu və buraxılış qeydi olduqda status dəyişir.

## Hazırkı 11.0 dəyişikliklərinin sərhədi

Next picks üçün yeni batch əməliyyatı, Live hover pauzasının standartdan çıxarılması, qarışıq 140–360ms keçidlər, capsule morph, vahid SVG ikonlar, 12/16px aralıq ritmi, ulduz tier çəkiləri və 8 dəqiqəlik kiçik tövsiyə kartı tətbiq edilib. Yoxlama nəticələri CHANGELOG və GitHub Actions-da izlənir. Ekran konteksti hazırda yalnız Windows aktiv pəncərə başlığından yerli mövzu çıxarır; ayrıca istifadəçi seçimi ilə aktivləşir. Screenshot/OCR/vision modeli hazır deyil. macOS/Linux seçilmiş iş mövzusundan istifadə edir.

## Mərhələlər və asılılıqlar

| Mərhələ | Nəticə | Asılılıq | Qəbul qapısı |
|---|---|---|---|
| M1 — sabit əsas | Növbə, vizual sistem, əlçatanlıq, miqrasiya | 11.0 yoxlamaları | Next təkrarsız yeni batch; 100 hover dövründə yanlış rejim yoxdur; 100–200% mətn yoxlaması; xam şəxsi məlumat logda yoxdur |
| M2 — kontekst və çatdırılma | Sakit tövsiyələr, performans, platforma paketləri | M1, platforma icazələri və imza hesabları | 479s-də kart açılmır; 480s-dən sonra bir dəfə; kilid/tam ekran qorunur; EXE/DMG/AppImage/DEB/RPM real açılış sübutu |
| M3 — araşdırma axını | Axtarış, müqayisə, oxu və kolleksiyalar | M1 və etibarlı metadata | Böyük kataloqda fokus itmir; undo məlumat itirmir; ixrac/import roundtrip keçir |
| M4 — genişləndirmə | Companion və dillər | M2 məxfilik sərhədi, M3 sabit format | Razılıq və söndürmə işləyir; köhnə profil formatları açılır; uzun tərcümələr daşmır |

P1 əsas etibarlılıq və fayda, P2 genişləndirmədir. S = kiçik komponent işi; M = bir neçə komponent; L = platforma, icazə və ya tədqiqat tələb edir. Bunlar təqvim vədi deyil. Hər maddə ayrıca dəyişiklik və test sübutu ilə icra olunur. Birdən-birə 220 funksiyanın əlavə edilməsi əvəzinə mərhələ qapıları qorunur.

## 220 maddə

### Tövsiyə keyfiyyəti

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-001 | İzah olunan skor — ulduz, maraq və müxtəliflik paylarını ayrı göstərmək | P1 | M | Planlaşdırılır |
| RP-002 | Mövzu müxtəlifliyi limiti — ardıcıl üç eyni mövzunu azaltmaq | P1 | M | Planlaşdırılır |
| RP-003 | Sahib müxtəlifliyi kvotası — gündə bir təşkilatın həddən artıq görünməsini azaltmaq | P1 | M | Planlaşdırılır |
| RP-004 | Yeni kəşf sürgüsü — tanış və fərqli mövzular arasındakı payı dəyişmək | P1 | M | Planlaşdırılır |
| RP-005 | Uzunmüddətli maraq profili — mövsümi klikləri əsas maraqdan ayırmaq | P1 | M | Planlaşdırılır |
| RP-006 | Müvəqqəti maraq profili — yalnız bugünkü sessiyaya aid seçim | P1 | M | Planlaşdırılır |
| RP-007 | Mənfi rəy səbəbləri — uyğun deyil, artıq bilirəm, çox mürəkkəb | P1 | M | Planlaşdırılır |
| RP-008 | Oxşar repo qrupları — fork olmayan funksional oxşarları birləşdirmək | P1 | M | Planlaşdırılır |
| RP-009 | Tövsiyə simulyatoru — filtr dəyişməzdən əvvəl nəticə sayını göstərmək | P1 | M | Planlaşdırılır |
| RP-010 | Skor diaqnostikası — niyə müəyyən layihənin çıxmadığını izah etmək | P1 | M | Planlaşdırılır |

### Kataloq və təzəlik

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-011 | Əlavə kataloq səhifələri — üç səhifə limitindən nəzarətli genişlənmə | P1 | M | Planlaşdırılır |
| RP-012 | Yenilənmə növbəsi — köhnəlmiş metadata üçün prioritetli sorğu | P1 | M | Planlaşdırılır |
| RP-013 | ETag keşi — dəyişməyən GitHub cavablarını yenidən yükləməmək | P1 | M | Planlaşdırılır |
| RP-014 | API büdcəsi göstəricisi — qalan sorğuları və bərpa vaxtını göstərmək | P1 | S | Planlaşdırılır |
| RP-015 | Rate-limit növbəsi — sorğuları limit bərpa olunana qədər saxlamaq | P1 | M | Planlaşdırılır |
| RP-016 | Arxiv statusu yeniləyicisi — arxivləşmiş layihələri keşdən çıxarmaq | P1 | M | Planlaşdırılır |
| RP-017 | Repo köçürülməsi — owner dəyişəndə ID-ni qorumaq | P1 | M | Planlaşdırılır |
| RP-018 | Silinmiş repo davranışı — xətalı keçidi gizlətmək və səbəb göstərmək | P1 | M | Planlaşdırılır |
| RP-019 | Metadata mənşəyi — hansı sahənin nə vaxt alındığını göstərmək | P1 | M | Planlaşdırılır |
| RP-020 | Kataloq sağlamlığı — təkrarlanan ID və yararsız metadatanı saymaq | P1 | M | Planlaşdırılır |

### Live növbəsi

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-021 | Uzun sessiya növbəsi — minlərlə dəyişmədə yaddaş limitini saxlamaq | P1 | M | Planlaşdırılır |
| RP-022 | İstifadəçi təkrar intervalı — 30 dəqiqəni seçilən vaxtla əvəzləmək | P1 | M | Planlaşdırılır |
| RP-023 | Sessiya geri baxışı — göstərilmiş kartlara brauzer açmadan qayıtmaq | P1 | M | Planlaşdırılır |
| RP-024 | Növbə önizləməsi — qarşıdakı üç uyğun layihəni göstərmək | P1 | M | Planlaşdırılır |
| RP-025 | Müxtəliflik əsaslı interval — oxşar kartlarda daha uzun gözləmək | P1 | M | Planlaşdırılır |
| RP-026 | Kart üzrə sabitləmə — bir kartı saxlayıb digərini Live dəyişmək | P1 | M | Planlaşdırılır |
| RP-027 | Live yalnız kompakt rejimdə — böyük paneldə oxunu sabit saxlamaq | P1 | M | Planlaşdırılır |
| RP-028 | Live yalnız paneldə — kompakt adacıq adını sabit saxlamaq | P1 | M | Planlaşdırılır |
| RP-029 | Şəbəkəsiz növbə göstəricisi — neçə keşlənmiş seçim qaldığını göstərmək | P1 | S | Planlaşdırılır |
| RP-030 | İdentifikator invariantı — hər addımda görünən ID-lərin unikallığını yoxlamaq | P1 | M | Planlaşdırılır |

### İş konteksti

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M2.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-031 | macOS tətbiq kateqoriyası — icazəli yerli tətbiq adı analizi | P1 | L | Planlaşdırılır |
| RP-032 | Linux X11 konteksti — tətbiq adı üçün ayrıca platforma adapteri | P1 | L | Planlaşdırılır |
| RP-033 | Wayland kontekst adapteri — portal dəstəyi varsa açıq razılıqla istifadə | P1 | L | Planlaşdırılır |
| RP-034 | Tətbiq istisnaları — seçilən proqramların başlığını heç analiz etməmək | P1 | M | Planlaşdırılır |
| RP-035 | Sessiya mövzusu təsdiqi — avtomatik mövzunu bir kliklə düzəltmək | P1 | M | Planlaşdırılır |
| RP-036 | Kontekst ömrü — köhnə mövzunu müəyyən vaxtdan sonra sıfırlamaq | P1 | M | Planlaşdırılır |
| RP-037 | Bir neçə mövzu yaddaşı — son fəaliyyətin zamanla azalan çəkisi | P1 | M | Planlaşdırılır |
| RP-038 | Kontekst baxışı — saxlanan aqreqat mövzuları istifadəçiyə göstərmək | P1 | M | Planlaşdırılır |
| RP-039 | Müəyyən tətbiq profili — dizayn proqramı üçün ayrıca tövsiyə qaydası | P1 | M | Planlaşdırılır |
| RP-040 | İxtiyari lokal vizual analiz — ayrıca icazə və yerli model ilə gələcək araşdırma | P1 | L | Planlaşdırılır |

### Sakit tövsiyə təcrübəsi

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M2.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-041 | Gündəlik tövsiyə limiti — avtomatik açılan kart sayını məhdudlaşdırmaq | P1 | M | Planlaşdırılır |
| RP-042 | Təqdimat rejimi — ekran paylaşımında təklifləri dayandırmaq | P1 | M | Planlaşdırılır |
| RP-043 | Tam ekran aşkarlanması — oyun və videonun üstünə kart çıxarmamaq | P1 | M | Planlaşdırılır |
| RP-044 | İclas rejimi — istifadəçinin seçdiyi vaxt aralığında sakit qalmaq | P1 | M | Planlaşdırılır |
| RP-045 | Səkkiz dəqiqə izahı — kartın niyə indi açıldığını qısa göstərmək | P1 | S | Planlaşdırılır |
| RP-046 | Bir saat mürgülətmə — avtomatik tövsiyəni müvəqqəti söndürmək | P1 | M | Planlaşdırılır |
| RP-047 | Sabaha qədər mürgülətmə — növbəti yerli günədək pauza | P1 | M | Planlaşdırılır |
| RP-048 | İş saatları — tövsiyələri yalnız seçilən gün və saatlarda göstərmək | P1 | M | Planlaşdırılır |
| RP-049 | Tövsiyə yeri — ayrıca ekran küncü və monitor seçmək | P1 | M | Planlaşdırılır |
| RP-050 | Səssiz dönüş — işə qayıdanda kartı animasiya ilə kompakt etmək | P1 | M | Planlaşdırılır |

### Məxfilik nəzarəti

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-051 | Məlumat xəritəsi — hər saxlanan sahənin məqsədini göstərmək | P1 | M | Planlaşdırılır |
| RP-052 | Saxlama müddəti — keçid tarixçəsini gün sayına görə avtomatik silmək | P1 | M | Planlaşdırılır |
| RP-053 | Konteksti dərhal sıfırlamaq — aqreqat mövzu yaddaşını təmizləmək | P1 | M | Planlaşdırılır |
| RP-054 | Məxfi tətbiq bloku — parol menecerləri üçün ayrıca istisna siyahısı | P1 | S | Planlaşdırılır |
| RP-055 | Şəxsi domen istisnaları — browser companion üçün daxil edilməyən domenlər | P1 | M | Planlaşdırılır |
| RP-056 | Profil ixrac önizləməsi — ixrac ediləcək sahələri əvvəlcədən göstərmək | P1 | M | Planlaşdırılır |
| RP-057 | Profil import fərqi — əlavə və silinən maraqları müqayisə etmək | P1 | M | Planlaşdırılır |
| RP-058 | Yerli şifrəli ehtiyat — istifadəçi parolu ilə portativ profil arxivi | P1 | L | Planlaşdırılır |
| RP-059 | Şəxsi sessiya — öyrənmə və tarixçəni sessiya üzrə dayandırmaq | P1 | M | Planlaşdırılır |
| RP-060 | Məxfilik diaqnostikası — xam URL və başlıq sızmalarını avtomatik yoxlamaq | P1 | M | Planlaşdırılır |

### Adacıq davranışı

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-061 | Monitor üzrə mövqe — hər ekran üçün ayrıca adacıq yeri | P1 | M | Planlaşdırılır |
| RP-062 | DPI keçidi — monitorlar arasında ölçünü sabit saxlamaq | P1 | M | Planlaşdırılır |
| RP-063 | Taskbar toqquşması — gizli taskbar açıldıqda uyğun yer dəyişmək | P1 | M | Planlaşdırılır |
| RP-064 | Çox kiçik ekran profili — 800px enli iş sahəsi üçün ayrıca düzülüş | P1 | M | Planlaşdırılır |
| RP-065 | Dock sıxlığı — ad, qısa izah və idarələri üç ölçüdə təqdim etmək | P1 | M | Planlaşdırılır |
| RP-066 | Yapışma xətləri — sürükləyərkən ekran kənarına hizalamaq | P1 | M | Planlaşdırılır |
| RP-067 | Mövqe kilidi — təsadüfi sürükləməni bloklamaq | P1 | M | Planlaşdırılır |
| RP-068 | Mövqe bərpası — ekran ayrıldıqda təhlükəsiz monitora qayıtmaq | P1 | M | Planlaşdırılır |
| RP-069 | Touch rejimi — hover olmayan cihazlarda böyük hədəflər | P1 | M | Planlaşdırılır |
| RP-070 | Qələm rejimi — stylus yaxınlaşmasını kliklə qarışdırmamaq | P1 | M | Planlaşdırılır |

### Animasiya sistemi

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-071 | Kadr büdcəsi — zəif GPU-da animasiya yükünü avtomatik azaltmaq | P1 | M | Planlaşdırılır |
| RP-072 | 120Hz profili — yüksək yenilənən ekranlarda zamanlamanı yoxlamaq | P1 | M | Planlaşdırılır |
| RP-073 | Əks istiqamətə davam — yarımçıq morph-u cari kadrdan çevirmək | P1 | M | Planlaşdırılır |
| RP-074 | Məsafəyə uyğun morph — ölçü fərqinə görə müddəti tənzimləmək | P1 | M | Planlaşdırılır |
| RP-075 | Animasiya önizləməsi — parametri tətbiq etməzdən əvvəl göstərmək | P1 | M | Planlaşdırılır |
| RP-076 | Fərdi motion profili — hover, kart və drawer sürətlərini ayrı saxlamaq | P1 | M | Planlaşdırılır |
| RP-077 | Yuxudan dönüş səhnəsi — qayıdanda köhnə animasiyaları bitirmək | P1 | M | Planlaşdırılır |
| RP-078 | Kart ölçüsü sabitliyi — uzun mətn gələndə hündürlük sıçrayışını azaltmaq | P1 | M | Planlaşdırılır |
| RP-079 | Rəng keçidi idarəsi — vurğu rəngini yumşaq dəyişmək | P1 | M | Planlaşdırılır |
| RP-080 | Motion iz qeydi — zaman və rejimləri xam şəxsi məlumat olmadan yazmaq | P1 | M | Planlaşdırılır |

### Vizual sistem

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-081 | İkon müqaviləsi — bütün idarələrə eyni ölçü və stroke qaydası | P1 | S | Planlaşdırılır |
| RP-082 | Kontrast auditoru — mövzularda mətn fon nisbətini ölçmək | P1 | M | Planlaşdırılır |
| RP-083 | Aralıq token auditi — komponent boşluqlarını bir mənbədən idarə etmək | P1 | M | Planlaşdırılır |
| RP-084 | Şrift fallback sınağı — Windows, macOS və Linux ölçülərini müqayisə etmək | P1 | L | Planlaşdırılır |
| RP-085 | Sətr uzunluğu nəzarəti — izahları oxunaqlı maksimum enlə göstərmək | P1 | M | Planlaşdırılır |
| RP-086 | Sıxlıq canlı önizləməsi — compact və comfortable fərqini dərhal göstərmək | P1 | M | Planlaşdırılır |
| RP-087 | Uzun owner adları — adın qırılması üçün ayrıca qayda | P1 | M | Planlaşdırılır |
| RP-088 | Yüklənmə skeleti — məlumat gözləyən sahədə sabit ölçülü placeholder | P1 | M | Planlaşdırılır |
| RP-089 | Boş hal illüstrasiyası — səbəb və bir uyğun əməliyyat göstərmək | P1 | M | Planlaşdırılır |
| RP-090 | Sistem mövzusu — açıq və tünd görünüşü OS ilə izləmək | P1 | M | Planlaşdırılır |

### Əlçatanlıq

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-091 | Ekran oxuyucu axını — kart dəyişəndə yalnız qısa elan | P1 | M | Planlaşdırılır |
| RP-092 | Fokus xəritəsi — hər pəncərə rejimi üçün məntiqli tab sırası | P1 | M | Planlaşdırılır |
| RP-093 | Yüksək kontrast sistem rejimi — forced-colors ilə yoxlama | P1 | M | Planlaşdırılır |
| RP-094 | 200% mətn — böyük yazıda gizlənməyən əsas idarələr | P1 | L | Planlaşdırılır |
| RP-095 | Klaviatura təsviri — bütün qısa yolların axtarılan siyahısı | P1 | S | Planlaşdırılır |
| RP-096 | Fərdi qısa yollar — konflikt aşkarlanması ilə dəyişmək | P1 | M | Planlaşdırılır |
| RP-097 | Rəngsiz status — xəta və uğuru simvol və mətnlə ayırmaq | P1 | M | Planlaşdırılır |
| RP-098 | Hərəkət həssaslığı — opacity-only keçid paketi | P1 | M | Planlaşdırılır |
| RP-099 | Ekran oxuyucu testləri — əsas axınlara platforma yoxlaması | P1 | L | Planlaşdırılır |
| RP-100 | Fokus geri qaytarılması — dialoq bağlananda düzgün idarəyə dönüş | P1 | M | Planlaşdırılır |

### Axtarış

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M3.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-101 | Yazı səhvi tolerantlığı — yaxın repo adlarını təklif etmək | P2 | M | Planlaşdırılır |
| RP-102 | Axtarış sintaksisi köməkçisi — operatorları yazarkən izah etmək | P2 | M | Planlaşdırılır |
| RP-103 | Saxlanmış sorğular — tez-tez istifadə edilən filtri adlandırmaq | P2 | M | Planlaşdırılır |
| RP-104 | Son sorğular — yerli tarixçəni istifadəçi nəzarətində saxlamaq | P2 | M | Planlaşdırılır |
| RP-105 | Uyğun söz vurğusu — nəticədə hansı hissənin uyğunlaşdığını göstərmək | P2 | M | Planlaşdırılır |
| RP-106 | İnkremental nəticələr — böyük kitabxanada hissə-hissə render | P2 | M | Planlaşdırılır |
| RP-107 | Lisenziya ailələri — permissive və copyleft filtrləri | P2 | M | Planlaşdırılır |
| RP-108 | Son aktivlik filtri — metadata təzədirsə tarixə görə daraltmaq | P2 | M | Planlaşdırılır |
| RP-109 | Star interval operatoru — 100K–200K kimi dəqiq aralıq | P2 | M | Planlaşdırılır |
| RP-110 | Semantik yerli axtarış — optional embedding modeli ilə araşdırma | P2 | L | Planlaşdırılır |

### Araşdırma və müqayisə

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M3.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-111 | Repo alternativləri — seçilən layihəyə fərqli yanaşmalar göstərmək | P2 | M | Planlaşdırılır |
| RP-112 | Yan-yana README bölmələri — istifadəçinin seçdiyi qısa hissələr | P2 | M | Planlaşdırılır |
| RP-113 | Dil payı müqayisəsi — doğrulanmış API metadatası əsasında | P2 | M | Planlaşdırılır |
| RP-114 | Buraxılış tezliyi müqayisəsi — release tarixlərini ümumiləşdirmək | P2 | M | Planlaşdırılır |
| RP-115 | Arxiv xəbərdarlığı — müqayisədə baxımsız layihəni aydın ayırmaq | P2 | M | Planlaşdırılır |
| RP-116 | İnteqrasiya matrisi — istifadəçinin daxil etdiyi uyğunluq qeydləri | P2 | M | Planlaşdırılır |
| RP-117 | Qərar qeydi — niyə bir repo seçildiyini kolleksiyada saxlamaq | P2 | M | Planlaşdırılır |
| RP-118 | Şəxsi qiymətləndirmə çəkiləri — sənəd, sadəlik, platforma üzrə bal | P2 | L | Planlaşdırılır |
| RP-119 | Müqayisə ixracı — seçilmiş metadatanı Markdown cədvəlinə çevirmək | P2 | M | Planlaşdırılır |
| RP-120 | Repo əlaqə qrafı — yalnız təsdiqlənmiş əlaqələrdən qurmaq | P2 | M | Planlaşdırılır |

### Oxu axını

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M3.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-121 | Növbə üçün vaxt büdcəsi — 5 və 15 dəqiqəlik oxu sessiyası | P2 | M | Planlaşdırılır |
| RP-122 | Oxu mərhələləri — baxılacaq, araşdırılır, sınaqdan keçdi | P2 | M | Planlaşdırılır |
| RP-123 | Növbə prioriteti — manual sıralama və sabit pinlər | P2 | M | Planlaşdırılır |
| RP-124 | Gündə bir layihə — geniş araşdırma üçün fokus seçimi | P2 | M | Planlaşdırılır |
| RP-125 | Oxu məqsədi — quraşdır, müqayisə et, öyrən kimi niyyət | P2 | M | Planlaşdırılır |
| RP-126 | Şəxsi xatırlatma — yalnız açıq seçilən tarixdə yerli xəbər | P2 | M | Planlaşdırılır |
| RP-127 | Tərk edilmiş araşdırma — yarımçıq qeydi yenidən təklif etmək | P2 | M | Planlaşdırılır |
| RP-128 | Qısa oxu qeydi — bir cümləlik nəticə sahəsi | P2 | M | Planlaşdırılır |
| RP-129 | Oxunan repo icmalı — həftəlik yerli fəaliyyət xülasəsi | P2 | M | Planlaşdırılır |
| RP-130 | Növbə təmizləmə — köhnə maddələri əvvəlcədən baxışla arxivləşdirmək | P2 | M | Planlaşdırılır |

### Kolleksiyalar

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M3.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-131 | Ağıllı kolleksiyalar — dil və mövzu qaydası ilə üzvlük | P2 | M | Planlaşdırılır |
| RP-132 | Kolleksiya qovluqları — əlaqəli siyahıları birlikdə toplamaq | P2 | S | Planlaşdırılır |
| RP-133 | Kolleksiya təsviri — istifadə məqsədini və meyarlarını yazmaq | P2 | M | Planlaşdırılır |
| RP-134 | Kolleksiya sıralaması — sürükləmə və klaviatura ilə idarə | P2 | M | Planlaşdırılır |
| RP-135 | Paylaşılan ixrac — şəxsi qeydləri ayrıca istisna etmək | P2 | M | Planlaşdırılır |
| RP-136 | Markdown import — GitHub linklərindən təhlükəsiz toplu əlavə | P2 | M | Planlaşdırılır |
| RP-137 | Dublikat birləşdirmə — qeydləri itirmədən ID əsasında uyğunlaşdırmaq | P2 | M | Planlaşdırılır |
| RP-138 | Kolleksiya dəyişiklik jurnalı — yerli düzəlişləri geri qaytarmaq | P2 | M | Planlaşdırılır |
| RP-139 | Kolleksiya arxivi — aktiv siyahıdan gizlədib saxlamaq | P2 | S | Planlaşdırılır |
| RP-140 | Kolleksiya sağlamlığı — silinmiş və köçürülmüş repoları işarələmək | P2 | M | Planlaşdırılır |

### Quraşdırma köməkçisi

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M2.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-141 | OS uyğun asset — release fayllarını platformaya görə qruplaşdırmaq | P1 | L | Planlaşdırılır |
| RP-142 | CPU arxitekturası — x64 və arm64 seçimlərini ayırmaq | P1 | M | Planlaşdırılır |
| RP-143 | Asset ölçüsü — endirmədən əvvəl MB və versiyanı göstərmək | P1 | M | Planlaşdırılır |
| RP-144 | Rəsmi checksum yoxlaması — varsa hash ilə müqayisə | P1 | M | Planlaşdırılır |
| RP-145 | İmza məlumatı — yayımlayanın imza statusunu dəqiq göstərmək | P1 | L | Planlaşdırılır |
| RP-146 | Portable fərqi — quraşdırılan və portativ paketi izah etmək | P1 | M | Planlaşdırılır |
| RP-147 | Release qeydi önizləməsi — rəsmi dəyişiklik qeydlərinə keçid | P1 | M | Planlaşdırılır |
| RP-148 | Paket meneceri xəritəsi — yalnız təsdiqlənən winget/brew/flatpak ID-ləri | P1 | M | Planlaşdırılır |
| RP-149 | Quraşdırma bələdçisi — README setup bölməsinə birbaşa keçid | P1 | M | Planlaşdırılır |
| RP-150 | Versiya seçimi — stabil və prerelease faylları qarışdırmamaq | P1 | M | Planlaşdırılır |

### Browser companion

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M4.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-151 | Domen üzrə razılıq — analiz icazəsini sayt səviyyəsində vermək | P2 | M | Planlaşdırılır |
| RP-152 | İstisna pəncərəsi — gizli pəncərələrdə profili dayandırmaq | P2 | M | Planlaşdırılır |
| RP-153 | Profil önizləməsi — çıxarılmış mövzuları göndərmədən göstərmək | P2 | M | Planlaşdırılır |
| RP-154 | Yalnız GitHub siqnalları — başqa sayt olmadan öyrənmə rejimi | P2 | M | Planlaşdırılır |
| RP-155 | Əl ilə profil ötürmə — avtomatik kanal olmadan JSON axını | P2 | M | Planlaşdırılır |
| RP-156 | Təkrarsız profil birləşməsi — eyni ixracı iki dəfə saymamaq | P2 | M | Planlaşdırılır |
| RP-157 | Siqnal vaxtı — köhnə maraq aqreqatlarının çəkisini azaltmaq | P2 | M | Planlaşdırılır |
| RP-158 | Companion diaqnostikası — bağlantı vəziyyətini və son importu göstərmək | P2 | M | Planlaşdırılır |
| RP-159 | Səhifə üzrə pauza — cari saytı müvəqqəti istisna etmək | P2 | M | Planlaşdırılır |
| RP-160 | İxrac formatı versiyası — köhnə companion ilə uyğunluq testləri | P2 | M | Planlaşdırılır |

### Performans

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M2.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-161 | Boşda CPU büdcəsi — normal gizli vəziyyətdə iş yükünü ölçmək | P1 | M | Planlaşdırılır |
| RP-162 | Keş ölçü limiti — köhnə metadatanı sərhəd daxilində saxlamaq | P1 | M | Planlaşdırılır |
| RP-163 | Virtual kitabxana — yalnız görünən nəticələri DOM-a çıxarmaq | P1 | M | Planlaşdırılır |
| RP-164 | İkon keşlənməsi — təkrar SVG parse işini azaltmaq | P1 | S | Planlaşdırılır |
| RP-165 | Fon taymeri konsolidasiyası — ayrı timerlər əvəzinə vahid planlayıcı | P1 | M | Planlaşdırılır |
| RP-166 | Disk yazısı birləşməsi — sürətli ardıcıl dəyişiklikləri bir save etmək | P1 | M | Planlaşdırılır |
| RP-167 | Başlanğıc profili — ilk görünüşə qədər vaxtı ölçmək | P1 | M | Planlaşdırılır |
| RP-168 | Zəif cihaz profili — blur və bahalı effektləri avtomatik azaltmaq | P1 | M | Planlaşdırılır |
| RP-169 | Batareya rejimi — enerji qənaətində interval və effektləri azaltmaq | P1 | M | Planlaşdırılır |
| RP-170 | Uzunmüddətli yaddaş testi — 8 saatlıq sessiyada sızma izləmək | P1 | L | Planlaşdırılır |

### Etibarlılıq

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-171 | Versiyalı vəziyyət miqrasiyası — hər format üçün geriyə uyğun çevirmə | P1 | M | Planlaşdırılır |
| RP-172 | Atomik ehtiyat faylı — yarımçıq yazmadan son sağlam vəziyyətə dönüş | P1 | M | Planlaşdırılır |
| RP-173 | Əməliyyat ID-ləri — təkrarlanan IPC kliklərini bir dəfə işləmək | P1 | M | Planlaşdırılır |
| RP-174 | Uyğun olmayan import — sahə üzrə səhv hesabatı | P1 | M | Planlaşdırılır |
| RP-175 | Dayandırılıb davam testi — OS suspend zamanı növbəni qorumaq | P1 | M | Planlaşdırılır |
| RP-176 | Saat dəyişməsi — sistem vaxtı geri gedəndə taymerləri düzəltmək | P1 | M | Planlaşdırılır |
| RP-177 | Gün sərhədi testi — yerli gecə yarısında seçim ardıcıllığı | P1 | M | Planlaşdırılır |
| RP-178 | Offline başlanğıc — şəbəkəsiz ilk ekranı təhlükəsiz açmaq | P1 | M | Planlaşdırılır |
| RP-179 | Yarımçıq yeniləmə bərpası — əvvəlki işlək quruluşa dönüş bələdçisi | P1 | M | Planlaşdırılır |
| RP-180 | İstifadəçi diaqnostika paketi — şəxsi məlumatdan təmizlənmiş xəta ixracı | P1 | M | Planlaşdırılır |

### Təhlükəsiz tətbiq sərhədi

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M2.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-181 | IPC sxemləri — hər kanalda ölçü və tip doğrulaması | P1 | M | Planlaşdırılır |
| RP-182 | URL host yoxlaması — bütün xarici keçidləri eyni qaydada təsdiqləmək | P1 | M | Planlaşdırılır |
| RP-183 | Import ölçü limiti — böyük JSON ilə yaddaş daşmasının qarşısını almaq | P1 | M | Planlaşdırılır |
| RP-184 | HTML enjeksiyası sınağı — repo təsvirlərini mətn kimi göstərmək | P1 | M | Planlaşdırılır |
| RP-185 | Fayl ixrac path yoxlaması — seçilən yol sərhədini qorumaq | P1 | M | Planlaşdırılır |
| RP-186 | Asılılıq inventarı — quraşdırılmış paketlərin izlənən siyahısı | P1 | S | Planlaşdırılır |
| RP-187 | SBOM istehsalı — hər build üçün maşın oxunan tərkib | P1 | M | Planlaşdırılır |
| RP-188 | Dependency yeniləmə siyasəti — avtomatik PR və uyğunluq yoxlaması | P1 | M | Planlaşdırılır |
| RP-189 | Release provenance — build mənbəyini doğrulayan attestation | P1 | M | Planlaşdırılır |
| RP-190 | İmza açarı prosesi — şəxsi açarı repoya qoymadan buraxılış imzası | P1 | L | Planlaşdırılır |

### Buraxılış və platforma

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M2.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-191 | Windows imzası — uyğun sertifikat veriləndə Authenticode | P1 | L | Planlaşdırılır |
| RP-192 | macOS notarization — Apple hesabı ilə doğrulanan DMG | P1 | L | Planlaşdırılır |
| RP-193 | Linux paket smoke testi — DEB və RPM quraşdırma/çıxarma yoxlaması | P1 | L | Planlaşdırılır |
| RP-194 | AppImage launch testi — standart istifadəçi hüququ ilə açılış | P1 | M | Planlaşdırılır |
| RP-195 | Arm64 build matrisi — hər platformada ayrıca uyğun binary | P1 | L | Planlaşdırılır |
| RP-196 | Buraxılış checksum siyahısı — hər installer üçün SHA256 | P1 | S | Planlaşdırılır |
| RP-197 | Yükləmə səhifəsi — OS və arxitekturaya görə düzgün paket | P1 | M | Planlaşdırılır |
| RP-198 | Rollback paketi — əvvəlki versiyaya verilənləri itirmədən qayıtmaq | P1 | M | Planlaşdırılır |
| RP-199 | Yeniləmə xəbərçisi — opt-in yeni stabil versiya bildirişi | P1 | M | Planlaşdırılır |
| RP-200 | Release tamlıq qapısı — bütün platformalar keçmədən yayımlamamaq | P1 | L | Planlaşdırılır |

### Fərdiləşdirmə və dillər

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M4.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-201 | Azərbaycan dili — tarix, əməliyyat və xəta mətnlərinin tərcüməsi | P2 | M | Planlaşdırılır |
| RP-202 | Türk dili — eyni açar sistemi üzərindən lokallaşdırma | P2 | M | Planlaşdırılır |
| RP-203 | Rus dili — uzun mətnlər üçün uyğun layout yoxlaması | P2 | M | Planlaşdırılır |
| RP-204 | RTL hazırlığı — istiqamət asılı CSS-i məntiqi property-lərə keçirmək | P2 | M | Planlaşdırılır |
| RP-205 | Mətn ölçüsü profili — panel və kompakt rejim üçün ayrı ölçü | P2 | M | Planlaşdırılır |
| RP-206 | Vurğu palitrası — kontrast yoxlanmış fərdi rəng seçimi | P2 | M | Planlaşdırılır |
| RP-207 | Şəxsi başlanğıc səhifəsi — library və ya discovery seçmək | P2 | M | Planlaşdırılır |
| RP-208 | Profil preset ixracı — görünüşü maraqlardan ayrıca paylaşmaq | P2 | M | Planlaşdırılır |
| RP-209 | Qısa təsvir dili — orijinal təsviri saxlayaraq tərcümə seçimi | P2 | M | Planlaşdırılır |
| RP-210 | Tərcümə statusu — avtomatik və müəllif mətnini aydın ayırmaq | P2 | M | Planlaşdırılır |

### Keyfiyyət və məhsul ölçüləri

Qəbul: hər maddədə yazılan davranış müvafiq müsbət və uğursuzluq ssenarisi ilə yoxlanır; şəxsi məlumat toplama avtomatik aktivləşmir. Asılı mərhələ: M1.

| ID | İdeya və gözlənilən davranış | Prioritet | Ölçü | Status |
|---|---|---|---|---|
| RP-211 | İstifadəçi ssenari matrisi — bütün əsas axınları platformalara bölmək | P1 | L | Planlaşdırılır |
| RP-212 | Vizual snapshot fərqi — compact, panel, workspace şəkillərini müqayisə | P1 | M | Planlaşdırılır |
| RP-213 | Real mouse sürətli testi — 100 enter/leave ilə rejim yarışını tutmaq | P1 | M | Planlaşdırılır |
| RP-214 | Layout property testləri — təsadüfi ekran ölçülərində daşma axtarmaq | P1 | M | Planlaşdırılır |
| RP-215 | Növbə property testləri — uzun rotasiyada cari ID-nin təkrarını tutmaq | P1 | M | Planlaşdırılır |
| RP-216 | Əlçatanlıq CI qapısı — kritik pozuntuda build-i dayandırmaq | P1 | M | Planlaşdırılır |
| RP-217 | Şəbəkə nasazlığı inyeksiyası — timeout və 429 davranışlarını sınamaq | P1 | M | Planlaşdırılır |
| RP-218 | Yerli keyfiyyət paneli — istifadəçiyə seçimin müxtəlifliyini göstərmək | P1 | M | Planlaşdırılır |
| RP-219 | Opt-in anonim məhsul ölçümü — ayrıca razılıqla minimal sayğaclar | P1 | M | Planlaşdırılır |
| RP-220 | Buraxılış qəbul checklisti — sübut linkləri olmadan hazır deməmək | P1 | M | Planlaşdırılır |

## İşin seçilməsi və bitməsi

Hər növbəti iş üçün əvvəlcə mövcud xətanın təkrarlanma addımları, sonra görünən nəticə yazılır. Eyni məlumat modelinə toxunan işlər ardıcıl aparılır. Vizual dəyişiklikdə əvvəl/sonra screenshot, davranış dəyişiklikdə real IPC/native yoxlaması, platforma dəyişiklikdə həmin platformadan build sübutu tələb olunur. Windows və macOS paketinin yığılması həmin cihazda davranışın yoxlandığı demək deyil.

Kontekstlə bağlı işlərdə xam başlıq və görüntü default olaraq saxlanmır; istifadəçi funksiyanı söndürə və aqreqatları sıfırlaya bilir. Eksperimental model və telemetriya ayrıca opt-in olmalıdır. API cavabı olmayan xüsusiyyətlər təxminlə təqdim edilmir. Sınaq məlumatları istehsal kataloquna qarışdırılmır.

Hazır olma qaydası: kod main-dədir; məqsədə uyğun testlər keçir; istifadəçi ssenarisi sübutu var; məhdudiyyətlər və miqrasiya sənədləşib; paketlər eyni mənbədən yığılıb. Bu şərtlərdən biri çatışmırsa maddə “Planlaşdırılır” və ya “Yoxlanılır” qalır.
