/* Registration link.
   Paste the PUBLIC Google Form link here (…/viewform or forms.gle/…).
   Never paste the /edit link — it gives edit access to anyone who opens the site. */
const REG_URL='https://docs.google.com/forms/d/e/1FAIpQLScB2K8n84eovEpP1K2eKSIAX1B4zgJTcA8N-IP_EhX7ojkFsA/viewform';
(function(){
  const ok=/^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/|az-group\.kz)/.test(REG_URL)&&!/\/edit/.test(REG_URL);
  if(!ok){console.warn('REG_URL is not a public Google Form link');return}
  document.querySelectorAll('a[data-reg]').forEach(a=>{a.href=REG_URL});
})();
// registration buttons scroll to the form embedded on this page
document.querySelectorAll('a[data-scroll]').forEach(a=>a.addEventListener('click',e=>{
  const t=document.querySelector(a.getAttribute('href'));if(!t)return;
  e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});
}));

/* ================= i18n ================= */
// key: [kk, en]; Russian comes from the HTML itself
const T={
"title":["Fibonacci 2026–2027 — математика олимпиадасы, 3–11 сынып, Қазақстан", "Fibonacci Maths Olympiad 2026–2027 — grades 3–11, Kazakhstan"],
"desc":["Fibonacci — 3–11 сынып оқушыларына арналған математика олимпиадасы. Республикалық кезең 2026–2027 Қазақстан қалаларында, финал Түркия мен Италияда. Тіркелу.", "Fibonacci maths olympiad for grades 3–11. National round 2026–2027 in cities across Kazakhstan, World Final in Turkey and Italy. Register online."],
"keywords":["математика олимпиадасы 2026-2027, математика олимпиадасы тіркелу, математикадан халықаралық олимпиада, халықаралық математикалық байқау, Fibonacci олимпиадасы Қазақстан, бастауыш сынып олимпиадасы, 3 сынып математика олимпиадасы, 4 сынып математика олимпиадасы, 5 сынып математика олимпиадасы, оқушыларға арналған олимпиада, олимпиада тапсырмалары, олимпиадаға дайындық, олимпиада сертификаты, олимпиада дипломы, дарынды балаларға олимпиада, олимпиада ережесі, олимпиадаға қатысу құны, олимпиада нәтижелері, әлемдік финал Түркия Италия, Астана олимпиада, Алматы олимпиада, Шымкент олимпиада, Қарағанды олимпиада, олимпиада по математике 2026-2027, олимпиада Фибоначчи, Fibonacci International Maths Olympiad", "international mathematics olympiad Kazakhstan 2026-2027, Fibonacci International Maths Olympiad, Fibonacci Olympiad Kazakhstan, math olympiad for grades 3-11, math competition for school students Kazakhstan, math olympiad registration, math olympiad certificate, international math olympiad diploma, Fibonacci olympiad world final Turkey Italy, math olympiad fee Kazakhstan, math olympiad Astana, math olympiad Almaty, math competition for kids, olympiad for gifted students Kazakhstan, math olympiad practice tasks, math olympiad results, олимпиада по математике 2026-2027, олимпиада Фибоначчи"],
"nav.about":["Олимпиада туралы","About"],"nav.stages":["Кезеңдер","Stages"],"nav.format":["Формат","Format"],"nav.prizes":["Жүлделер","Prizes"],"nav.faq":["Сұрақтар","FAQ"],"nav.reg":["Тіркелу","Register"],
"hero.tag":["3–11(12) сынып оқушыларына арналған халықаралық математика олимпиадасы · 30+ ел","International mathematics olympiad for grades 3–11(12) · 30+ countries"],
"hero.cta":["Қатыс","Take part"],"nav.doc":["Ереже","Regulations"],"doc.t":["Олимпиада туралы ереже","Olympiad regulations"],"doc.s":["Ресми құжат · 2026–2027 маусымы","Official document · 2026–2027 season"],"trial.t":["Сынақ тапсырмалар","Practice tasks"],"trial.s":["Дайындыққа арналған материалдар · Google Диск","Preparation materials · Google Drive"],"pay.btn":["Kaspi арқылы төлеу","Pay via Kaspi"],"pay.link":["Kaspi-де төлеу","Pay in Kaspi"],"foot.offer":["Қоғамдық ұсыныс","Public offer"],"price.offer":["Қатысуды төлеу арқылы сіз <a href=\"/oferta\">қоғамдық ұсыныс</a> талаптарын қабылдайсыз.","By paying for participation you accept the terms of the <a href=\"/oferta\">public offer</a>."],"wa.label":["Кеңес алу","Get a consultation"],"wa.sub":["WhatsApp арқылы","on WhatsApp"],"hero.rep":["Қазақстандағы ресми өкіл","Official representative in Kazakhstan"],"hero.scroll":["Төмен","Scroll"],"hero.skip":["Өткізіп жіберу","Skip"],
"mq.1":["Логика","Logic"],"mq.2":["Дәлдік","Precision"],"mq.3":["Әлемдік финал","World Final"],"mq.4":["Түркия","Türkiye"],"mq.5":["Италия","Italy"],"mq.6":["30+ ел","30+ countries"],"mq.7":["Халықаралық дипломдар","International diplomas"],
"vid.t":["Бейнені көру","Watch the video"],"vid.s":["30 секунд · дыбыспен","30 seconds · with sound"],
"about.badge":["ел жыл сайын Fibonacci олимпиадасын өткізеді","countries host the Fibonacci olympiad every year"],
"about.eye":["Олимпиада туралы","About"],
"about.h":["Әлемдік деңгейдегі олимпиада — <em>Қазақстанда үшінші жыл</em>","A world-class olympiad — <em>in Kazakhstan for the third year</em>"],
"about.p1":["Fibonacci International Maths Olympiad — әлемнің 30-дан астам елінде өтетін беделді халықаралық математика олимпиадасы. Қазақстанда ол екі кезеңнен тұрады: республикалық кезең — еліміздің қалаларында, әлемдік финал — Түркияда немесе Италияда.","Fibonacci International Maths Olympiad is a prestigious international mathematics olympiad held in more than 30 countries. In Kazakhstan it runs in two stages: the national round in cities across the country and the World Final in Türkiye or Italy."],
"about.p2":["Біздің мақсатымыз — оқушылардың зияткерлік әлеуетін ашу, оларды нақты ғылымдармен айналысуға шабыттандыру және халықаралық білім беру қауымдастығына жол ашу.","Our goal is to unlock students’ intellectual potential, inspire them to pursue the sciences and open the door to the international education community."],
"st.1":["қатысушы ел","countries"],"st.2":["жас санаты","age categories"],"st.3":["тапсырма","problems"],"st.4":["минут","minutes"],"st.5":["тіл таңдауға","languages"],
"goals.eye":["Олимпиаданың міндеттері","Our mission"],
"stmt":["Фибоначчи тізбегіндегі әр сан — алдыңғы екеуінің қосындысы. Әр жеңіс — білімнің, табандылық пен батылдықтың қосындысы.","Every Fibonacci number is the sum of the two before it. Every victory is the sum of knowledge, persistence and courage."],
"g1":["Математикалық қабілеттерді анықтау және дарынды оқушыларды қолдау","Discover mathematical talent and support gifted students"],
"g2":["Әрі қарай оқуға арналған мықты портфолио қалыптастыру","Build a strong portfolio for future studies"],
"g3":["Халықаралық білім беру ынтымақтастығын дамыту","Develop international educational cooperation"],
"g4":["Мұғалімдер мен мектептерге жаңа мүмкіндіктер ашу","Open new opportunities for teachers and schools"],
"ben.eye":["Артықшылықтар","Why join"],"ben.h":["Неге <em>қатысу</em> керек","Why <em>take part</em>"],
"b1.h":["Әлемдік финалға жол","A path to the World Final"],"b1.p":["Республикалық кезеңде 50%-дан астам дұрыс жауап берсеңіз — шетелдегі әлемдік финалға өтесіз.","Score more than 50% on the national round and you qualify for the World Final abroad."],
"b2.h":["Халықаралық дипломдар","International diplomas"],"b2.p":["Жоғары білім деңгейін растайтын және шетелдік мектептер мен университеттерге түсуге көмектесетін сертификаттар мен дипломдар.","Certificates and diplomas that confirm a high level of knowledge and help with admission to schools and universities abroad."],
"b3.h":["Әлемдік деңгейдегі тәжірибе","World-class experience"],"b3.p":["Әр елдің мықты құрдастарымен жарысып, өзіңізді халықаралық ортада сынап көріңіз.","Compete with top peers from different countries and test yourself on an international stage."],
"q.text":["«Табиғат кітабы математика тілінде жазылған»","“The book of nature is written in the language of mathematics”"],"q.by":["Галилео Галилей","Galileo Galilei"],
"stg.eye":["Кезеңдер","Stages"],"stg.h":["Екі кезең — финалға <em>бір жол</em>","Two stages — <em>one path</em> to the final"],
"s1.lbl":["I кезең","Stage I"],"s1.h":["Республикалық","National round"],
"s1.p":["Қазан мен ақпан аралығында Қазақстан қалаларында күндізгі форматта өтеді. Мектеп базасында тек сол мектептің оқушылары үшін өткізуге болады.","Held in person in cities across Kazakhstan from October to February. A school may also host it exclusively for its own students."],
"s1.l1":["Орны мен уақыты кемінде 3 күн бұрын e-mail арқылы және AZ GROUP әлеуметтік желілерінде хабарланады","Venue and time are announced at least 3 days ahead by e-mail and on AZ GROUP social media"],
"s1.l2":["Бірнеше рет қатысуға болады — ең жақсы нәтиже есептеледі","You can take part several times — your best score counts"],
"s1.l3":["Ұпайлар 15 жұмыс күні ішінде fibonacci-olympiads.kz сайтында жарияланады","Scores are published on fibonacci-olympiads.kz within 15 working days"],
"pass":["дұрыс жауап — әлемдік финалға өту шегі","correct answers — the qualifying score for the World Final"],
"s2.lbl":["II кезең","Stage II"],"s2.h":["Әлемдік финал","World Final"],
"s2.p":["Финалистер өтетін елді өздері таңдайды. Қазақстандық қатысушылардың сапарын AZ GROUP LLC ұйымдастырады.","Finalists choose the host country. AZ GROUP LLC organises the trip for participants from Kazakhstan."],
"tr":["Түркия","Türkiye"],"it":["Италия","Italy"],"apr":["2027 жылғы сәуір","April 2027"],"may":["2027 жылғы мамыр","May 2027"],
"s2.note":["Финалға тек AZ GROUP LLC арқылы қатысуға болады; шығындарды қатысушылар ұйымдастырушылардың бағдарламасына сәйкес өздері көтереді.","Participation in the final is only through AZ GROUP LLC; participants cover their own costs according to the organisers’ programme."],
"tl.h":["Маусым <em>күнтізбесі</em>","Season <em>calendar</em>"],
"tl1.d":["Қазан — Ақпан","October — February"],"tl1.t":["Қазақстан қалаларында республикалық кезең","National round in cities of Kazakhstan"],
"tl2.d":["2027 жылғы наурыз","March 2027"],"tl2.t":["Жалпы нәтижелер fibonacci-olympiads.kz сайтында жарияланады","Overall results published on fibonacci-olympiads.kz"],
"tl3.t":["Түркиядағы әлемдік финал · Астанада салтанатты марапаттау","World Final in Türkiye · Awards ceremony in Astana"],
"tl4.t":["Италиядағы әлемдік финал","World Final in Italy"],
"cat.eye":["Қатысушылар","Participants"],"cat.h":["Бес <em>санат</em>","Five <em>categories</em>"],
"cat.p":["Қазақстандағы мемлекеттік және жеке мектептердің оқушыларына арналған. Әркім тек өз санатында жарысады.","For students of public and private schools in Kazakhstan. Everyone competes strictly within their own category."],
"g34":["3–4 сынып","Grades 3–4"],"g56":["5–6 сынып","Grades 5–6"],"g78":["7–8 сынып","Grades 7–8"],"g910":["9–10 сынып","Grades 9–10"],"g1112":["11(12) сынып","Grade 11(12)"],
"fmt.eye":["Формат","Format"],"fmt.h":["Олимпиада <em>қалай өтеді</em>","How the <em>olympiad works</em>"],
"fmt.p":["Күндізгі форматта, бір күнде екі ағынмен өтеді. Тапсырмалар ресми халықаралық олимпиадалардың бағдарламаларына сәйкес келеді және АҚШ, Еуропа мен Қазақстанның академиктері мен оқытушыларының қатысуымен әзірленген.","In person, in two sessions on a single day. Problems follow the programmes of official international olympiads and are developed with academics and teachers from the USA, Europe and Kazakhstan."],
"f1":["4–5 жауап нұсқасы бар тапсырма","problems with 4–5 answer options"],"f2":["минут орындауға","minutes to complete"],"f3":["тіл: қазақ, орыс, ағылшын","languages: Kazakh, Russian, English"],"f4":["әр тапсырмада бір дұрыс жауап","correct answer per problem"],
"ok.h":["Алуға болады","You may bring"],"ok.1":["Қара немесе көк түсті шарикті қалам","A black or blue ballpoint pen"],"ok.2":["Мөлдір бөтелкедегі су","Water in a clear bottle"],
"no.h":["Тыйым салынады","Not allowed"],"no.1":["Жоба қағаздар, кітаптар мен оқулықтар","Scratch paper, books and textbooks"],"no.2":["Телефондар, планшеттер, калькуляторлар және кез келген гаджеттер","Phones, tablets, calculators and any gadgets"],"no.3":["Тапсырмаларды көшіру және суретке түсіру — дисквалификация","Copying or photographing problems — disqualification"],
"inf.h":["Маңызды","Important"],"inf.1":["Басталуына 30 минут қалғанда келіңіз","Arrive 30 minutes before the start"],"inf.2":["30 минутқа дейін кешіксеңіз — тек қалған уақытқа жіберіледі","Up to 30 minutes late — admitted for the remaining time only"],"inf.3":["Жауаптар бланкіде анық әрі толық боялады","Answers are shaded clearly and fully on the answer sheet"],
"pr.eye":["Марапаттар","Awards"],"pr.h":["Республикалық кезеңнің <em>жүлделері</em>","National round <em>prizes</em>"],
"pr.p":["Барлық қатысушылар электронды сертификат алады, жеңімпаздар мен жүлдегерлер — диплом. Салтанатты марапаттау 2027 жылғы сәуірде Астанада өтеді.","All participants receive an electronic certificate; winners and prize-winners receive diplomas. The awards ceremony takes place in Astana in April 2027."],
"p1":["Ноутбук","Laptop"],"p2":["«Алиса» Яндекс станциясы","Yandex Station \u201cAlice\u201d"],"p3":["Құлаққаптар","Headphones"],
"d1":["I дәрежелі диплом","1st-degree diploma"],"d2":["II дәрежелі диплом","2nd-degree diploma"],"d3":["III дәрежелі диплом","3rd-degree diploma"],
"th.c":["Санат","Category"],"th.1":["1-орын","1st place"],"th.2":["2-орын","2nd place"],"th.3":["3-орын","3rd place"],
"pn1":["Жүлделі орынға қажетті ең төменгі ұпай әр санат үшін белгіленеді. Орындар 1 : 2 : 3 қатынасында бөлінеді.","The minimum score for a prize is set for each category. Places are distributed in a 1 : 2 : 3 ratio."],
"pn2":["Ұпайлар тең болса, бір сынып төмен оқитын қатысушыға басымдық беріледі.","In case of a tie, priority goes to the participant in the lower grade."],
"pn3":["Жүлделер ақшаға айырбасталмайды және бір ай ішінде алынуы тиіс.","Prizes cannot be exchanged for cash and must be collected within one month."],
"reg.eye":["Тіркелу","Registration"],"reg.h":["Олимпиадаға дейін <em>үш қадам</em>","Three steps <em>to the olympiad</em>"],
"r1.h":["Форманы толтырыңыз","Fill in the form"],"r1.p":["осы сайттағы «Тіркелу» батырмасын басыңыз — санат пен қаланы таңдаңыз","click “Register” on this site — choose your category and city"],"form.eye":["Тіркелу","Registration"],"form.h":["Тіркеу <em>формасы</em>","Registration <em>form</em>"],"form.p":["Батырманы басыңыз — тіркеу формасы ашылады. Олимпиаданың орны мен уақыты көрсетілген e-mail-ге келеді.","Click the button to open the registration form. The venue and time of the olympiad will be sent to the e-mail you provide."],"form.btn":["Тіркелу","Register now"],"form.note":["Google Форма жаңа қойындыда ашылады","The Google Form opens in a new tab"],"form.open":["Форманы жаңа қойындыда ашу","Open the form in a new tab"],"duo.cap":["AZ GROUP — Fibonacci International Olympiads-тің Қазақстандағы <em>ресми өкілі</em>","AZ GROUP is the <em>official representative</em> of Fibonacci International Olympiads in Kazakhstan"],
"r2.h":["Қатысуды төлеңіз","Pay the fee"],"r2.p":["Kaspi арқылы AZ GROUP LLC шотына қолма-қолсыз аударыммен","by bank transfer via Kaspi to AZ GROUP LLC"],
"r3.h":["Олимпиадаға келіңіз","Come to the olympiad"],"r3.p":["орны мен уақыты кемінде 3 күн бұрын e-mail-ге келеді","venue and time will be emailed at least 3 days ahead"],
"price.lbl":["Қатысу құны","Participation fee"],
"price.p":["Республикалық кезең. Төлем олимпиаданы өткізуге, тапсырмаларды әзірлеуге, марапаттау рәсіміне және жүлде қорына жұмсалады. Олимпиада өткеннен кейін төлем қайтарылмайды.","National round. The fee covers running the olympiad, problem development, the awards ceremony and the prize fund. Fees are non-refundable after the olympiad."],
"price.cta":["Тіркелуге өту","Go to registration"],
"org.eye":["Ұйымдастырушылар","Organisers"],"org.h":["Олимпиаданы <em>кім өткізеді</em>","Who <em>runs the olympiad</em>"],
"o1.r":["Ұйымдастырушы","Organiser"],"o1.p":["Кеңсесі Римде (Италия) орналасқан халықаралық компания.","An international company headquartered in Rome, Italy."],
"o2.r":["Қазақстандағы өкіл","Representative in Kazakhstan"],"o2.p":["Олимпиаданың ҚР-дағы ресми үйлестірушісі: республикалық кезең және әлемдік финалға сапар.","Official coordinator in Kazakhstan: the national round and the trip to the World Final."],
"o3.r":["Серіктес ұйымдастырушы","Co-organiser"],"o3.h":["«Астана дарыны»","“Astana Daryny”"],"o3.p":["Дарынды балалар мен талантты жастарды анықтау және қолдау орталығы.","Centre for identifying and supporting gifted children and talented youth."],
"faq.eye":["Сұрақтар","FAQ"],"faq.h":["Жиі қойылатын <em>сұрақтар</em>","Frequently asked <em>questions</em>"],
"q1":["Қайта қатысуға бола ма?","Can I take part more than once?"],"a1":["Иә, бөлек төлем арқылы. Барлық әрекеттің ішінен ең жоғары ұпай есептеледі; тек бір жүлделі орын алуға болады.","Yes, for a separate fee. Your highest score across all attempts counts; you can win only one prize place."],
"q2":["Олимпиада қай тілде өтеді?","What language is the olympiad in?"],"a2":["Қатысушының таңдауы бойынша: қазақ, орыс немесе ағылшын тілінде.","Participant’s choice: Kazakh, Russian or English."],
"q3":["Нәтижелер қашан шығады?","When are results published?"],"a3":["Ұпайлар 15 жұмыс күні ішінде fibonacci-olympiads.kz сайтында жарияланады. Жалпы нәтижелер — 2027 жылғы наурызда.","Scores are posted on fibonacci-olympiads.kz within 15 working days. Overall results are published in March 2027."],
"q4":["Апелляция беруге бола ма?","Can I appeal my result?"],"a4":["Жоқ. Нәтижелердің толық талдауы берілмейді, апелляция қарастырылмаған.","No. Detailed breakdowns are not provided and there is no appeal procedure."],
"q5":["Төлем қайтарыла ма?","Is the fee refundable?"],"a5":["Олимпиада өткеннен кейін — жоқ. Форс-мажор жағдайында ашық тіркеу аясында басқа күні немесе басқа қалада тапсыруға болады.","Not after the olympiad has taken place. In case of force majeure you can sit it on another date or in another city while registration is open."],
"q6":["Финалға сапарды кім төлейді?","Who pays for the trip to the final?"],"a6":["Қатысушылар өздері, әлемдік финал ұйымдастырушыларының бағдарламасына сәйкес. Қатысу — тек AZ GROUP LLC арқылы.","Participants cover the costs themselves, according to the World Final organisers’ programme. Participation is only through AZ GROUP LLC."],
"q7":["Fibonacci олимпиадасына кім қатыса алады?", "Who can take part in the Fibonacci olympiad?"],"a7":["Қазақстандағы мемлекеттік және жеке мектептердің 3–11(12) сынып оқушылары. Қатысушылар бес санатта жарысады: 3–4, 5–6, 7–8, 9–10 және 11(12) сыныптар.", "Students in grades 3–11(12) of public and private schools in Kazakhstan. Participants compete in five categories: grades 3–4, 5–6, 7–8, 9–10 and 11(12)."],
"q8":["Қалай тіркелуге болады және қатысу қанша тұрады?", "How do I register and how much does it cost?"],"a8":["«Тіркелу» формасын толтырыңыз — санат пен қаланы таңдаңыз — және Kaspi арқылы төлеңіз. Республикалық кезеңге қатысу құны — 25 000 ₸. Өтетін орны мен уақыты e-mail-ге кемінде 3 күн бұрын келеді.", "Fill in the registration form — choose your category and city — and pay via Kaspi. The national round costs 25,000 ₸. The venue and time are emailed at least 3 days in advance."],
"q9":["Республикалық кезең қайда және қашан өтеді?", "Where and when is the national round held?"],"a9":["2026 жылғы қазаннан 2027 жылғы ақпанға дейін Қазақстан қалаларында күндізгі форматта. Олимпиада мектеп базасында да — тек сол мектептің оқушылары үшін — өтуі мүмкін.", "In person in cities across Kazakhstan from October 2026 to February 2027. A school may also host it for its own students only."],
"q10":["Әлемдік финалға қалай өтуге болады?", "How do I qualify for the World Final?"],"a10":["Республикалық кезеңде дұрыс жауаптардың 50%-дан астамын жинау керек. Финалистер елді таңдайды: Түркия (2027 жылғы сәуір) немесе Италия (2027 жылғы мамыр). Сапарды AZ GROUP LLC ұйымдастырады.", "Score more than 50% correct answers in the national round. Finalists choose the country: Turkey (April 2027) or Italy (May 2027). AZ GROUP LLC organises the trip."],
"q11":["Жеңімпаздар қандай жүлде алады?", "What prizes do winners get?"],"a11":["Барлық қатысушылар электрондық сертификат алады, жеңімпаздар мен жүлдегерлер — I–III дәрежелі дипломдар мен жүлделер: ноутбук, «Алиса» Яндекс станциясы, құлаққаптар. Салтанатты марапаттау — 2027 жылғы сәуірде Астанада.", "Every participant gets an e-certificate; winners and prize-winners get 1st–3rd degree diplomas and prizes: a laptop, a Yandex Station “Alice”, headphones. The award ceremony is in Astana in April 2027."],
"q12":["25 000 ₸ қатысу құнына не кіреді?","What does the 25,000 ₸ fee include?"],"a12":["Төлем республикалық кезеңді өткізуді қамтиды: техникалық қамтамасыз ету, тапсырмаларды әзірлеу, марапаттау рәсімі және жүлде қорын қалыптастыру. Әлемдік финалға сапар бөлек төленеді.","The fee covers the national round: technical organisation, task development, the award ceremony and the prize fund. The trip to the World Final is paid separately."],
"q13":["Сертификат пен диплом қалай және қашан беріледі?","How and when are the certificate and diploma issued?"],"a13":["Әрбір қатысушы электрондық түрде қатысу сертификатын алады. Жеңімпаздар мен жүлдегерлер — I–III дәрежелі дипломдар; салтанатты марапаттау 2027 жылғы сәуірде Астанада Қазақстанның барлық қалалары үшін өтеді.","Every participant receives an electronic certificate of participation. Winners and prize-winners get 1st–3rd degree diplomas; the award ceremony takes place in Astana in April 2027 for all cities of Kazakhstan."],
"q14":["Республикалық кезең қай қалаларда өтеді?","Which cities host the national round?"],"a14":["Қазақстан қалаларында — қаланы тіркеу формасында таңдайсыз. Қалаңыздағы нақты орын мен уақыт кемінде 3 күн бұрын e-mail-ге келеді және AZ GROUP әлеуметтік желілерінде жарияланады. Форс-мажор жағдайында ашық тіркеу аясында басқа қалада тапсыруға болады.","In cities across Kazakhstan — you choose your city in the registration form. The exact venue and time in your city are emailed and posted on AZ GROUP social media at least 3 days in advance. In case of force majeure you can sit the olympiad in another city while registration is open."],
"q15":["Олимпиадаға қалай дайындалуға болады? Сынақ тапсырмалар бар ма?","How do I prepare? Are there practice tasks?"],"a15":["Иә — дайындыққа арналған сынақ тапсырмалар Google Дискіде жарияланған, сілтеме «Олимпиада туралы» бөлімінде. Олимпиадада сізді 4–5 жауап нұсқасы бар 20 тапсырма және орындауға 60 минут күтеді; тапсырмалар ресми халықаралық олимпиадалардың бағдарламаларына сәйкес келеді.","Yes — practice tasks are published on Google Drive; the link is in the “About” section. At the olympiad you get 20 multiple-choice tasks with 4–5 options and 60 minutes; the tasks follow the syllabus of official international olympiads."],
"q16":["3-сынып немесе 11-сынып оқушысы қатыса ала ма?","Can a grade 3 or grade 11 student take part?"],"a16":["Иә. Олимпиадаға Қазақстанның мемлекеттік және жеке мектептерінің 3–11(12) сынып оқушылары жіберіледі. 3-сынып оқушылары K1 санатында (3–4 сынып), 11 және 12 сынып оқушылары — K5 санатында жарысады. Әрбір қатысушы тек өз санатында қатысады.","Yes. Students in grades 3 to 11(12) of public and private schools in Kazakhstan are eligible. Grade 3 students compete in category K1 (grades 3–4), grade 11 and 12 students in category K5. Every participant competes strictly in their own category."],
"fin.h":["Тізбектегі келесі сан — <em>сенің нәтижең</em>","The next number in the sequence is <em>your result</em>"],
"fin.p":["Республикалық кезеңге тіркеліп, әлемдік финалға жолыңды баста.","Register for the national round and start your journey to the World Final."],
"foot.rep":["Қазақстан Республикасындағы ресми өкіл — AZ GROUP LLC, Астана қ.","Official representative in the Republic of Kazakhstan — AZ GROUP LLC, Astana"],
"lead.btn":["Кеңес алу","Get a consultation"],"lead.sub":["өтінім қалдыру","leave a request"],"lead.eye":["Кеңес","Consultation"],"lead.h":["<em>Кеңес</em> алу","Get a <em>consultation</em>"],"lead.p":["Байланыс деректеріңізді қалдырыңыз — менеджер қайта қоңырау шалып, олимпиада туралы барлық сұрақтарға жауап береді.","Leave your contacts — a manager will call you back and answer all your questions about the olympiad."],"lead.name":["Атыңыз","Your name"],"lead.phone":["Телефон","Phone"],"lead.q":["Сұрақ (міндетті емес)","Question (optional)"],"lead.send":["Өтінім жіберу","Send request"],"lead.note":["Батырманы басу арқылы сіз дербес деректерді өңдеуге келісесіз.","By pressing the button you agree to the processing of your personal data."],"lead.wa":["немесе WhatsApp-қа жазыңыз","or message us on WhatsApp"],"lead.ok.h":["Өтінім <em>жіберілді</em>","Request <em>sent</em>"],"lead.ok.p":["Рахмет! Менеджер жақын арадағы жұмыс уақытында сізбен байланысады.","Thank you! A manager will contact you during working hours shortly."],"lead.ok.btn":["Жабу","Close"],
"foot.photo":["Фото: Unsplash","Photos: Unsplash"]
};
const RU={};
document.querySelectorAll('[data-i]').forEach(el=>{RU[el.dataset.i]??=el.innerHTML});
RU.title=document.title;
const META={desc:document.querySelector('meta[name=description]'),kw:document.querySelector('meta[name=keywords]'),ogT:document.querySelector('meta[property="og:title"]'),ogD:document.querySelector('meta[property="og:description"]'),twT:document.querySelector('meta[name="twitter:title"]'),twD:document.querySelector('meta[name="twitter:description"]')};
RU.desc=META.desc?META.desc.content:'';RU.keywords=META.kw?META.kw.content:'';
const HTML_LANG={ru:'ru',kk:'kk',en:'en'};
let LANG='ru';
function setLang(l){
  if(!HTML_LANG[l])l='ru';
  LANG=l;
  const idx=l==='kk'?0:1;
  document.querySelectorAll('[data-i]').forEach(el=>{
    const k=el.dataset.i;
    el.innerHTML=l==='ru'?RU[k]:(T[k]?T[k][idx]:RU[k]);
  });
  const title=l==='ru'?RU.title:T.title[idx],desc=l==='ru'?RU.desc:T.desc[idx],kw=l==='ru'?RU.keywords:T.keywords[idx];
  document.title=title;
  // search snippets and link previews follow the chosen language
  if(META.desc)META.desc.content=desc;if(META.kw)META.kw.content=kw;
  if(META.ogT)META.ogT.content=title;if(META.twT)META.twT.content=title;if(META.ogD)META.ogD.content=desc;if(META.twD)META.twD.content=desc;
  document.documentElement.lang=HTML_LANG[l];
  document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===l));
  if(window.onLang)onLang(l);
  try{localStorage.setItem('fib-lang',l)}catch(e){}
  if(window.ScrollTrigger)ScrollTrigger.refresh();
}
document.querySelectorAll('.lang button').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
(function(){
  let l=new URLSearchParams(location.search).get('lang');
  if(!l){try{l=localStorage.getItem('fib-lang')}catch(e){}}
  if(l&&l!=='ru')setLang(l);
})();

/* ================= promo video ================= */
(function(){
  const box=document.querySelector('.vid');if(!box)return;
  const v=box.querySelector('video');
  box.querySelector('.vid-play').addEventListener('click',()=>{box.classList.add('on');v.controls=true;v.play().catch(()=>{})});
  // stop the sound when the video scrolls out of view
  new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting&&!v.paused)v.pause()}),{threshold:.2}).observe(v);
})();

/* ================= nav ================= */
const hdr=document.getElementById('hdr'),burger=document.getElementById('burger'),links=document.getElementById('links');
addEventListener('scroll',()=>hdr.classList.toggle('solid',scrollY>40),{passive:true});
burger.addEventListener('click',()=>{links.classList.toggle('open');burger.classList.toggle('x')});
links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{links.classList.remove('open');burger.classList.remove('x')}));

/* ================= floating Fibonacci numbers in the hero ================= */
const floatNums=(function(){
  const box=document.getElementById('floatNums');
  const seq=[1,1,2,3,5,8,13,21,34,55,89,144,233,377];
  const small=innerWidth<700;
  const spots=[[8,18],[88,14],[14,78],[84,80],[4,48],[94,46],[30,10],[70,90],[24,90],[76,8],[50,6],[60,94],[40,88],[92,64]];
  return seq.slice(0,small?9:14).map((n,i)=>{
    const s=document.createElement('span');
    s.textContent=n;
    if(i%3===1)s.className='r';
    s.style.left=spots[i][0]+'%';s.style.top=spots[i][1]+'%';
    s.style.fontSize=(small?.55:1)*(28+Math.min(n,55)*1.6)+'px';
    box.appendChild(s);return s;
  });
})();

/* ================= animations ================= */
(function(){
  const root=document.documentElement;
  // Windows "Animation effects: off" also reports reduced motion — we still play a gentle
  // fade-in intro there, but skip the big movements.
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!window.gsap){root.classList.remove('intro','lock');countAll();return}
  gsap.registerPlugin(ScrollTrigger);
  scrollTo(0,0);
  document.fonts&&document.fonts.ready.then(()=>ScrollTrigger.refresh());
  document.querySelectorAll('img[loading=lazy]').forEach(i=>i.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true}));

  const navLogo=document.querySelector('.logo img');
  const icon=document.getElementById('introIcon');
  const grid=document.querySelectorAll('#grid rect'),bgSp=document.getElementById('bgSpiral');
  const t1=document.getElementById('t1'),t2=document.getElementById('t2');
  t1.innerHTML=[...t1.textContent].map(c=>`<span class="ch"><span>${c}</span></span>`).join('');
  const letters=t1.querySelectorAll('.ch>span');
  const navRest=['.links','.nav-r'].map(s=>document.querySelector(s));
  const rest=['.hero-tag','#ctaMain','.hero-rep'].map(s=>document.querySelector(s));
  // where the red Fibonacci square sits inside the AZ GROUP × Fibonacci logo (fractions of the image)
  const ICON={l:1017/1703,w:96/1703,t:5/155,h:146/155};

  gsap.set(rest,{autoAlpha:0,y:26});
  gsap.set(navRest,{autoAlpha:0});
  gsap.set('.scroll-cue',{autoAlpha:0});
  gsap.set([grid,bgSp],{strokeDasharray:1,strokeDashoffset:1});
  gsap.set(floatNums,{autoAlpha:0,scale:.4});
  gsap.set(t2,{clipPath:'inset(0% 100% 0% 0%)'});
  root.classList.remove('intro');

  const done=()=>{
    root.classList.remove('lock');document.getElementById('skip').style.display='none';
    gsap.set(icon,{autoAlpha:0});gsap.set(navLogo,{clearProps:'clipPath'});
    ScrollTrigger.refresh();
    // idle life: numbers drift, background spiral breathes
    if(!reduce){
      floatNums.forEach((n,i)=>gsap.to(n,{y:'+='+(12+i%4*8),x:'+='+(i%2?10:-10),rotation:i%2?6:-6,duration:4+i%5,ease:'sine.inOut',yoyo:true,repeat:-1}));
      gsap.to('.hero-art',{rotation:2.5,duration:14,ease:'sine.inOut',yoyo:true,repeat:-1});
    }
  };

  const tl=gsap.timeline({paused:true,onComplete:done});
  if(reduce){
    gsap.set([letters,navLogo],{autoAlpha:0});
    tl.to([grid,bgSp],{strokeDashoffset:0,duration:.8})
      .to(navLogo,{autoAlpha:1,duration:.5},'<.2')
      .to(letters,{autoAlpha:1,duration:.4,stagger:.04})
      .to(t2,{clipPath:'inset(0% 0% 0% 0%)',duration:.6},'<')
      .to(floatNums,{autoAlpha:1,scale:1,duration:.5})
      .to(rest,{autoAlpha:1,y:0,duration:.5,stagger:.08},'<')
      .to([navRest,'.scroll-cue'],{autoAlpha:1,duration:.4});
  }else{
    // where the red square sits inside the official logo in the top-left corner
    const lr=navLogo.getBoundingClientRect();
    const target={left:lr.left+lr.width*ICON.l,top:lr.top+lr.height*ICON.t,width:lr.width*ICON.w,height:lr.height*ICON.h};
    const big=Math.min(innerHeight*.42,innerWidth*.5);
    const bw=big*target.width/target.height;
    gsap.set(navLogo,{clipPath:`inset(0% ${(1-ICON.l-ICON.w)*100}% 0% ${ICON.l*100}%)`,autoAlpha:0});
    gsap.set(letters,{yPercent:115,rotation:8,autoAlpha:0});
    gsap.set(icon,{visibility:'visible',autoAlpha:1,left:innerWidth/2-bw/2,top:innerHeight/2-big/2,width:bw,height:big,
      '--a':'0deg',scale:.55,rotation:-14,transformOrigin:'50% 50%'});
    icon.style.webkitMaskImage=icon.style.maskImage='conic-gradient(from 200deg at 50% 50%,#000 var(--a),transparent 0)';

    tl.to(grid,{strokeDashoffset:0,duration:.9,stagger:{each:.08,from:'end'},ease:'power2.inOut'})
      .to(bgSp,{strokeDashoffset:0,duration:1.6,ease:'power2.inOut'},.25)
      // the red square is "drawn" by a sweeping mask while it springs into place
      .to(icon,{'--a':'360deg',duration:.9,ease:'power2.inOut'},.2)
      .to(icon,{scale:1,rotation:0,duration:1.1,ease:'elastic.out(1,.6)'},.25)
      // numbers burst out of the square and settle around the page
      .fromTo(floatNums,{autoAlpha:0,scale:.2,x:(i,el)=>innerWidth/2-el.getBoundingClientRect().left,y:(i,el)=>innerHeight/2-el.getBoundingClientRect().top},
        {autoAlpha:(i,el)=>el.classList.contains('r')?.13:.06,scale:1,x:0,y:0,duration:1.4,stagger:.04,ease:'expo.out'},1.05)
      .add(()=>{icon.style.webkitMaskImage=icon.style.maskImage='none'},1.15)
      // square flies up into the official logo in the corner…
      .to(icon,{left:target.left,top:target.top,width:target.width,height:target.height,duration:1.1,ease:'expo.inOut'},1.4)
      .set(navLogo,{autoAlpha:1},2.45)
      .to(navLogo,{clipPath:'inset(0% 0% 0% 0%)',duration:.9,ease:'expo.inOut'},2.45)
      .set(icon,{autoAlpha:0},2.6)
      // …while the name rises in the centre
      .to(letters,{yPercent:0,rotation:0,autoAlpha:1,duration:1,stagger:.05,ease:'back.out(1.7)'},1.9)
      .to(t2,{clipPath:'inset(0% 0% 0% 0%)',duration:.9,ease:'expo.inOut'},2.4)
      .to(rest,{autoAlpha:1,y:0,duration:.8,stagger:.12,ease:'power3.out'},2.8)
      .fromTo('#ctaMain',{scale:.8},{scale:1,duration:.9,ease:'elastic.out(1,.55)'},3)
      .to([navRest,'.scroll-cue'],{autoAlpha:1,duration:.6,stagger:.1},3.2);
  }
  Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(r=>setTimeout(r,1500))]).then(()=>{
    navLogo.complete?tl.play():navLogo.addEventListener('load',()=>tl.play(),{once:true});
  });

  // only an explicit click or Esc skips — scrolling no longer kills the intro
  const skip=()=>{if(tl.progress()<1)tl.progress(1)};
  document.getElementById('skip').addEventListener('click',skip);
  addEventListener('keydown',e=>{if(e.key==='Escape')skip()});

  // mouse parallax for the floating numbers
  if(!reduce&&matchMedia('(hover: hover)').matches){
    const hero=document.querySelector('.hero');
    hero.addEventListener('mousemove',e=>{
      const dx=e.clientX/innerWidth-.5,dy=e.clientY/innerHeight-.5;
      floatNums.forEach((n,i)=>gsap.to(n,{xPercent:dx*(20+i*4),yPercent:dy*(20+i*4),duration:1.2,ease:'power2.out',overwrite:'auto'}));
    });
  }

  // hero exit on scroll
  gsap.to('.lockup',{yPercent:-16,autoAlpha:0,scale:.95,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom 30%',scrub:true}});
  gsap.to('.hero-art',{scale:1.25,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});

  // generic reveals
  ScrollTrigger.batch('[data-r]',{start:'top 88%',once:true,
    onEnter:b=>gsap.fromTo(b,{autoAlpha:0,y:46},{autoAlpha:1,y:0,duration:1,stagger:.09,ease:'power3.out',overwrite:true})});
  gsap.set('[data-r]',{autoAlpha:0});
  // arriving from a subpage menu link like /#format: skip the intro and land on that section
  const target=location.hash&&document.getElementById(location.hash.slice(1));
  if(target){
    skip();target.scrollIntoView();ScrollTrigger.refresh();
    // a jump straight past a reveal's start doesn't fire its onEnter — show everything above the fold by hand
    ScrollTrigger.getAll().forEach(st=>{
      const el=st.trigger;
      if(el&&el.hasAttribute&&el.hasAttribute('data-r')&&el.getBoundingClientRect().top<innerHeight*.88){
        st.kill();gsap.fromTo(el,{autoAlpha:0,y:46},{autoAlpha:1,y:0,duration:1,ease:'power3.out',overwrite:true});
      }
    });
  }

  document.querySelectorAll('[data-clip]').forEach(el=>{
    gsap.fromTo(el,{clipPath:'inset(16% 10% 16% 10% round 18px)'},{clipPath:'inset(0% 0% 0% 0% round 18px)',ease:'power2.out',scrollTrigger:{trigger:el,start:'top 90%',end:'top 35%',scrub:1}});
  });
  document.querySelectorAll('[data-par]').forEach(img=>{
    gsap.fromTo(img,{yPercent:-7},{yPercent:7,ease:'none',scrollTrigger:{trigger:img.parentElement,start:'top bottom',end:'bottom top',scrub:true}});
  });
  document.querySelectorAll('[data-par2]').forEach(img=>{
    gsap.fromTo(img,{yPercent:-10,scale:1.05},{yPercent:10,scale:1.15,ease:'none',scrollTrigger:{trigger:img.closest('section'),start:'top bottom',end:'bottom top',scrub:true}});
  });
  const tlVert=matchMedia('(max-width:1080px)').matches;
  gsap.to('#tlFill',{[tlVert?'scaleY':'scaleX']:1,ease:'none',scrollTrigger:{trigger:'#tl',start:'top 70%',end:'bottom 60%',scrub:true}});
  gsap.to('#finalSpiral',{rotation:30,ease:'none',scrollTrigger:{trigger:'.final',start:'top bottom',end:'bottom top',scrub:true}});
  gsap.to('.marquee',{skewY:1.5,ease:'none',scrollTrigger:{trigger:'.marquee',start:'top bottom',end:'bottom top',scrub:true}});

  document.querySelectorAll('[data-count]').forEach(el=>{
    const n=+el.dataset.count,o={v:0};
    ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:()=>gsap.to(o,{v:n,duration:1.6,ease:'power2.out',onUpdate:()=>el.textContent=Math.round(o.v)})});
  });

  gsap.fromTo('.pod',{y:80,autoAlpha:0},{y:0,autoAlpha:1,stagger:.12,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.podium',start:'top 85%'}});
  gsap.fromTo('.cat',{rotation:-8},{rotation:0,stagger:.08,duration:1,ease:'back.out(2)',scrollTrigger:{trigger:'.cats',start:'top 85%'}});

  document.querySelectorAll('.cta-main').forEach(b=>{
    if(matchMedia('(hover: none)').matches)return;
    b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();gsap.to(b,{x:(e.clientX-r.left-r.width/2)*.25,y:(e.clientY-r.top-r.height/2)*.35,duration:.4})});
    b.addEventListener('mouseleave',()=>gsap.to(b,{x:0,y:0,duration:.6,ease:'elastic.out(1,.4)'}));
  });
})();
function countAll(){document.querySelectorAll('[data-count]').forEach(el=>el.textContent=el.dataset.count)}

/* ================= WhatsApp consultation ================= */
const WA_PHONE='77717001401';
const WA_MSG={
  ru:'Здравствуйте! Хочу получить консультацию по олимпиаде Fibonacci.',
  kk:'Сәлеметсіз бе! Fibonacci олимпиадасы бойынша кеңес алғым келеді.',
  en:'Hello! I would like a consultation about the Fibonacci olympiad.'
};
window.onLang=l=>document.querySelectorAll('a[data-wa]').forEach(a=>{a.href=`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(WA_MSG[l]||WA_MSG.ru)}`});
onLang(document.documentElement.lang||'ru');
// on phones the hero stays clean: icon only until the visitor scrolls
(function(){
  const w=document.querySelector('.wa');if(!w)return;
  const f=()=>w.classList.toggle('mini',innerWidth<=680&&scrollY<innerHeight*.6);
  f();addEventListener('scroll',f,{passive:true});addEventListener('resize',f);
})();

/* ================= consultation request → Bitrix24 (/api/lead) ================= */
(function(){
  const dlg=document.getElementById('lead'),form=document.getElementById('leadForm');
  if(!dlg||!form||typeof dlg.showModal!=='function')return;
  const ok=document.getElementById('leadOk'),err=document.getElementById('leadErr'),send=form.querySelector('[type=submit]');
  const MSG={
    ru:{name:'Укажите имя',phone:'Укажите номер телефона полностью',fail:'Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в WhatsApp.'},
    kk:{name:'Атыңызды жазыңыз',phone:'Телефон нөмірін толық жазыңыз',fail:'Өтінім жіберілмеді. Қайталап көріңіз немесе WhatsApp-қа жазыңыз.'},
    en:{name:'Please enter your name',phone:'Please enter your full phone number',fail:'Could not send the request. Please try again or message us on WhatsApp.'}
  };
  const m=()=>MSG[document.documentElement.lang]||MSG.ru;
  // UTM tags of the visit, so the lead in Bitrix shows where the visitor came from
  const utm={};
  try{
    const q=new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(k=>{const v=q.get(k);if(v)utm[k]=v});
    const ref=document.referrer;if(ref&&!ref.startsWith(location.origin+'/'))utm.referrer=ref;
    if(Object.keys(utm).length)sessionStorage.setItem('atl-utm',JSON.stringify(utm));
    else Object.assign(utm,JSON.parse(sessionStorage.getItem('atl-utm')||'{}'));
  }catch(e){}
  const showErr=t=>{err.textContent=t;err.hidden=!t};
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-lead]')){
      form.hidden=false;ok.hidden=true;showErr('');
      dlg.showModal();
    }else if(e.target.closest('[data-close]'))dlg.close();
    else if(e.target===dlg){
      // a click on the dimmed backdrop (outside the box) closes the form
      const r=dlg.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dlg.close();
    }
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const f=form.elements,name=f.name.value.trim(),phone=f.phone.value.trim(),digits=phone.replace(/\D/g,'');
    f.name.setAttribute('aria-invalid',!name);
    f.phone.setAttribute('aria-invalid',digits.length<10||digits.length>15);
    if(!name){showErr(m().name);f.name.focus();return}
    if(digits.length<10||digits.length>15){showErr(m().phone);f.phone.focus();return}
    showErr('');send.disabled=true;
    try{
      const r=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,phone,question:f.question.value.trim(),website:f.website.value,lang:document.documentElement.lang,page:location.href,...utm})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok)throw new Error(d.error||r.status);
      form.reset();form.hidden=true;ok.hidden=false;
      if(window.ymGoal)ymGoal('lead_sent');
    }catch(x){showErr(m().fail)}
    finally{send.disabled=false}
  });
})();
