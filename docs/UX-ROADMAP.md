# RepoPulse təcrübəsinin inkişaf planı

Məqsəd 12 175 layihədən ibarət kataloqda istifadəçinin uyğun layihəni, buraxılışı və bildiriş ayarını rahat tapmasıdır. Əvvəlcə mövcud funksiyaların əsas səhvləri aradan qaldırılır. Sonrakı mərhələlər istifadəçi sınaqları və ölçülə bilən nəticələr əsasında sıralanır.

**Hədəf 520 qəbul meyarı ilə təsdiqlənən təkmilləşdirmədir.** Aşağıdakı rəqəmlər hər istiqamət üzrə planlaşdırılmış iş həcmidir. Bunları buraxılmış funksiyaların sayı kimi istifadə etməyin.

| İstiqamət | Hədəf | İlk nəticə |
| --- | ---: | --- |
| Vizual sistem və naviqasiya | 85 | Ardıcıllığı olan kartlar və birbaşa görünən idarəetmə |
| Animasiya və qarşılıqlı əlaqə | 75 | Kəsilə bilən animasiyalar və hərəkəti azaltma dəstəyi |
| Bildiriş və diqqətin qorunması | 70 | Oxunmuş status, sakit rejim və təkrarın qarşısını alma |
| Repo və buraxılış izləməsi | 75 | İzləmə siyahısı üçün davamlı buraxılış tarixçəsi |
| Kəşf, kataloq və axtarış | 65 | Sürətli axtarış, aydın filtr və sabit səhifələmə |
| Əlçatanlıq və lokallaşdırma | 60 | Klaviatura, ekran oxuyucu və düzgün mətn ölçüləri |
| Platformalar və etibarlılıq | 55 | Windows, macOS və Linux üzrə yoxlanmış davranış |
| Performans və buraxılış keyfiyyəti | 35 | Ölçülə bilən sürət və reproduksiya edilən paketlər |
| **Cəmi** | **520** | |

## Mərhələ 1 · İstifadə zamanı maneələri aradan qaldırmaq

- **Düzülüş.** Əsas istifadə axınında kartı oxumaq, növbəti nəticəyə keçmək, canlı keçidi bərpa etmək və buraxılış qutusunu açmaq üçün görünən düymələr ver. Geniş paneldə dörd kartlıq düzülüşü saxla. Dar pəncərədə idarəetməni növbəti sətirə keçir. Sistem sətri şaquli və üfüqi ölçü məhdudiyyətində oxunaqlı qalsın.
- **Animasiyalar.** Açılış yarıda kəsiləndə köhnə effektləri dayandır. Panel dəyişdikdə yalnız cari görünüşün animasiyasını saxla. Hərəkəti azaltma ayarı aktivləşəndə davam edən animasiya da dayansın. Kompakt kartın izahatı oxunarkən dəyişməni saxla.
- **Avtomatik axın.** Sinxronizasiya və kart dəyişməsini ayrı idarə et. Əl ilə səhifələmə uğurlu olanda avtomatik keçidi saxla. Bir düymə ilə onu bərpa et. Boş nəticə, köhnəlmiş cavab və təkrar klik eyni kartın iki dəfə əlavə olunmasına səbəb olmasın.
- **İzləmə.** Mövcud RSS+ siyahısını istifadə et. Hər repoda ilk uğurlu yoxlamanı başlanğıc kimi saxla. Yeni aşkar olunan son stabil buraxılışı lokal qutuya əlavə et. Sıradakı repolar arasında dövr et və sorğu sayını məhdudlaşdır.
- **Bildirişlər.** Oxunmamış sayını əsas paneldə göstər. Tək buraxılışı açmaqla oxunmuş et və hamısını bir düymə ilə oxunmuş qeyd etməyə imkan ver. Sakit rejimdə yenilik qutuda qalsın. Bildirişdən keçid həmin buraxılışa açılır.
- **Məlumat.** Kataloqa uyğunluq yoxlaması ictimai olmayan nəticələri də kənarlaşdırmalıdır. Eyni repo ID-si köhnə saxlanmış qeyddə varsa, yeni mənbə məlumatı üstün olsun. RSS ixracında dörd cari kart və real ulduz sayı görünsün.
- **Qəbul.** Testlər ilk baxış, yeni buraxılış, təkrar hadisə, əvvəlki versiyaya düşmə, boş məlumat və yenidən açıldıqdan sonra oxunmuş vəziyyəti yoxlamalıdır. Masaüstü sınağında **Next**, **Resume**, buraxılış qutusuna keçid və dar panel görünüşü yoxlanmalıdır.

## Mərhələ 2 · Vizual sistem və əlçatanlıq

- **Dizayn sistemi.** Aralıq, radius, kölgə, şrift və rəng üçün məna daşıyan CSS dəyişənləri müəyyənləşdir. Əsas düymə, ikinci dərəcəli düymə, informasiya sətri və təhlükəli əməl görünüşlərini eyniləşdir.
- **Kart iyerarxiyası.** Repo adı, sahib, izahat, ulduz sayı və buraxılış vaxtı ayrı səviyyələrdə görünsün. Uzun adlar düymələri sıxışdırmasın. Loqo olmadıqda adın baş hərflərini göstər.
- **Panel ölçüləri.** 320 px enindən ultra-geniş ekrana qədər sətrlərin bərabərliyini yoxla. 100%, 125%, 150% və 200% ekran miqyası üçün ayrıca yoxlama apar. Geniş panelin alt hissəsi iş sahəsindən kənara çıxmasın.
- **Boş və xəta vəziyyətləri.** Kataloq boşluğu, filtr nəticəsi olmaması, bağlantı xətası və GitHub limiti üçün ayrıca mətn və bir əsas əməl göstər. Son uğurlu yenilənmə vaxtı ilə yoxlama cəhdini ayrı göstər.
- **Naviqasiya.** Tez-tez istifadə olunan axınları paneldə, geniş seçimləri komandalar bölməsində saxla. Klaviatura ilə bütün əsas əməliyyata çat. Bağlanan panel fokusu onu açan düyməyə qaytarsın.
- **Mətn.** Tarixi və rəqəmləri istifadəçi dilinə uyğun göstər. Azərbaycan və ingilis dillərində uzun adların, çoxsətirli izahların və dar panellərin sınaq nümunələrini hazırla.
- **Əlçatanlıq.** Ekran oxuyucuda kartın adı, statusu və düymə məqsədi ayrı anlaşılsın. Fokus göstəricisi görünən qalsın. Aydın kontrast və böyük mətn rejimləri vəziyyətləri yalnız rənglə bildirməsin.
- **Qəbul.** Əsas axınlar klaviatura ilə tamamlanır. Ekran oxuyucusu avtomatik keçiddə aramsız elan etmir. 200% miqyasda əsas əməl düymələri görünür və alətlər mətni örtmür.

## Mərhələ 3 · Hərəkət sistemi

- **Hərəkət qaydaları.** Pəncərə morfu, kontentin görünməsi, kart dəyişikliyi, fokus göstəricisi və bildiriş daxilolması üçün ortaq vaxt və sürət əyriləri müəyyənləşdir.
- **Pəncərə sabitliyi.** Açılma, yığılma, sürətli istiqamət dəyişməsi, alt-tab, ekranın kənara çəkilməsi və ekran həndəsəsi dəyişəndə gecikmiş cavab köhnə görünüşü qaytarmasın.
- **Oxuma rejimi.** İzahatı oxuyarkən, klaviatura ilə fokuslanarkən, menyu açıq olanda və platforma iş sahəsini gizlədəndə uyğun keçidləri dayandır və bərpa et.
- **Axın animasiyası.** Bir kartın dəyişməsi ilə bütün dəstin dəyişməsini ayrı göstər. Məzmunu oxunaqlı saxlayan yüngül keçidi əsas seçim et. Aşağı performanslı sistemlər üçün yüngül variant saxla.
- **İdarəetmə reaksiyası.** Düymənin basılması, saxlanma, ləğvetmə, uğursuz əməl və geri qaytarma vizual olaraq anlaşılsın. Eyni siqnal bir neçə animasiya ilə təkrarlanmasın.
- **Qəbul.** Sürətli açıb-bağlama sınağından sonra zombi animasiya, görünməyən klik sahəsi və yanlış pəncərə rejimi qalmır. Hərəkəti azaltma rejimində bütün əsas axınlar işləyir.

## Mərhələ 4 · Bildiriş və izləmə

- **İzləmə qaydaları.** Hər repo üçün stabil buraxılış, buraxılış namizədi və prerelease seçimlərini ayır. İzləməni dayandırma, müvəqqəti susdurma, siyahını sıralama və birdəfəlik səssiz başlanğıc əlavə et.
- **Buraxılış tarixçəsi.** Buraxılış ID-sini, repoya aidiyyəti və dərc vaxtını saxla. Silinmiş, yenidən dərc olunmuş və adı dəyişmiş repo üçün bərpa qaydalarını yaz.
- **Sorğu planı.** Oflayn olduqda son təsdiqlənmiş məlumatı göstər. Yenidən cəhd üçün artan fasilə, platformanın yuxudan qayıtması və autentifikasiya xətası üçün ayrıca davranış qur.
- **Bildiriş qaydaları.** Sakit saatlar, fokus görüşü, həftəlik xülasə, bir neçə yeniliyi birləşdirmək və repo üzrə prioritet seçimi əlavə et.
- **Bildiriş qutusu.** Oxunmamış və oxunmuş filtr, tarix üzrə qruplaşdırma, repo axtarışı, işarələmə, keçid kopyalama, buraxılış müqayisəsi və ixrac əlavə et.
- **İstifadəçi nəzarəti.** Bildiriş icazəsi, sınaq bildirişi, davranış barədə aydın izah və qənaətli arxa fon rejimi təqdim et. İzləmə seçilmiş GitHub repolarına aiddir.
- **Qəbul.** Ayarlar dəyişsə, tətbiq yenidən açılsa və ya GitHub əvvəlki buraxılışı qaytarsa, eyni hadisə təkrar yaranmır. Limitə çatmaq digər əsas funksiyaları bloklamır.

## Mərhələ 5 · Kataloq və optimallaşdırma

- **Axtarış.** Repo/sahib yazılışı, açar sözlər, mövzu, dil, ulduz intervalı və fəaliyyəti birləşdir. Seçili filtrləri göstərə və tək-tək silə bil. Nəticə sıfırdırsa filtri bərpa edən düymə ver.
- **Kəşf.** Yenilənmə, uyğunluq və populyarlıq üzrə çeşidləmə. Göstərilmə səbəbi, təkrarın qarşısının alınması, dəstə içində müxtəliflik və layihəni gizlətmə davranışını izah et.
- **Etibarlılıq.** Təsdiqlənmiş kataloqu atomik dəyiş. Şəbəkə yarıda kəsilsə, əvvəlki yüklənmiş kataloqdan davam et. Böyük katalogda fayl ölçüsünü və yenilənmə yükünü ölç.
- **Ölçmə.** 12 000+ repo ilə pəncərənin açılma vaxtı, axtarışın gecikməsi, **Next** əməliyyatı və boşda resurs sərfi üçün baza ölç. Başqa cihazda müqayisə üçün metodologiyanı qeyd et.
- **Qəbul.** Avtomatik və əl ilə seçim bir-birinə mane olmur. Görünən kart dəyişəndə məlumat köhnə vəziyyətə qayıtmır. Axtarış uzun yazı zamanı nəticələri köhnə sorğuya görə yeniləmir.

## Mərhələ 6 · Platformalar və buraxılış

- **Windows.** 125–200% ekran miqyası, bir neçə monitor, ekran kənarı, yuxudan qayıtma və sistem bildirişlərini yoxla.
- **macOS.** Menyu çubuğu, çentik, Mission Control, tam ekran, çoxmonitorlu yerləşmə və sistemin hərəkəti azaltma ayarlarını yoxla.
- **Linux.** X11 və Wayland-da ekran kənarına yerləşmə, klaviatura qısayolu, tray və bildiriş dəstəyini ayrıca yoxla.
- **Paketləmə.** Eyni təsdiqlənmiş kataloqu hər üç platformada saxla. Quraşdırmadan sonra başladılmanı, əsas pəncərəni və oflayn rejimi sınaqdan keçir.
- **Buraxılış qaydası.** Hər iş paketində müşahidə olunan problem, düzəliş, istifadəçi faydası və qəbul sınağı olsun. Vizual fərqlər hədəf ekran ölçülərində müqayisə edilsin. Şəbəkə və animasiya problemləri ayrıca stress sınağına daxil edilsin.
