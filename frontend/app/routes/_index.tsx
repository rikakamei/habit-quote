import { useEffect, useState } from "react";
import { json } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import QuoteDisplay from "~/components/QuoteDisplay";
import PersistentTaskSection from "../components/PersistentTaskSection";
import NormalTaskSection from "../components/NormalTaskSection";
import CalendarSection from "../components/CalendarSection";
import QuoteSection from "../components/QuoteSection";
import { dummyHistory } from "../data/dummyHistory";

export const links = () => [
    { rel: "stylesheet", href: "/app/components/QuoteDisplay.css" }
];

// APIのURL
const API_URL = "http://localhost:8000";

// --- 型定義 ---
interface Item
{
    id: number;
    title: string;
    persistent?: boolean;
    is_custom?: boolean;
}
interface Task extends Item
{
    status: boolean;
    persistent: boolean;
    is_custom?: boolean;
}
interface Quote
{
    id: number;
    quote_en: string;
    quote_ja: string;
    author: string;
}
interface Achievement
{
    id: number;
    date: string;
    completed_count: number;
    items: any[];
    quotes: Quote[];
    quote_chances: number;
}

// --- loaderで初期データ取得 ---
export const loader: LoaderFunction = async () =>
{
    const res = await fetch(`${API_URL}/items`);
    const items: Item[] = await res.json();
    return json(items);
};

const initialTasks: Task[] = [
    { id: 1, title: "早起きする", status: false, persistent: false },
    { id: 2, title: "運動する", status: false, persistent: false },
    { id: 3, title: "日記を書く", status: false, persistent: false },
];

// --- 追加: 日付が変わっても消えない常設タスク ---
const initialPersistentTasks: Task[] = [
    { id: 101, title: "水を飲む", status: false, persistent: true },
    { id: 102, title: "ストレッチ", status: false, persistent: true },
];

function getMonthDays(year: number, month: number)
{
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let d = 1; d <= lastDay.getDate(); d++)
    {
        days.push(d);
    }
    return days;
}

const persistentTaskTitles = ["水を飲む", "ストレッチ"];

export default function Index()
{
    const items = useLoaderData<typeof loader>();
    // persistentタスクも含めてtasksを初期化
    const [tasks, setTasks] = useState<Task[]>(() =>
    {
        let allTasks: Task[] = [];
        if (Array.isArray(items))
        {
            // 毎日やること: persistent: true のみ
            let persistentTasks = items.filter(item => item.persistent === true).map(item => ({ ...item, status: false, persistent: true, is_custom: item.is_custom }));
            // DBに存在しない場合は仮で追加
            persistentTaskTitles.forEach((title, idx) =>
            {
                if (!items.find(item => item.title === title && item.persistent === true))
                {
                    persistentTasks.push({ id: -(idx + 1), title, status: false, persistent: true, is_custom: false });
                }
            });
            // 今日だけやること: persistent: false のみ
            const normalTasks = items.filter(item => item.persistent === false).map(item => ({ ...item, status: false, persistent: false, is_custom: item.is_custom }));
            allTasks = [...persistentTasks, ...normalTasks];
        } else
        {
            allTasks = [...initialPersistentTasks, ...initialTasks];
        }
        return allTasks;
    });
    const [newItemTitle, setNewItemTitle] = useState("");
    const [revealedQuotes, setRevealedQuotes] = useState<Quote[]>([]);
    const [quoteChances, setQuoteChances] = useState(0);
    const [achievementId, setAchievementId] = useState<number | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [achievementQuote, setAchievementQuote] = useState<Quote | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [history, setHistory] = useState<{ tasks: string[]; quotes: Quote[] } | null>(null);
    const [today, setToday] = useState<Date | null>(null);
    const [year, setYear] = useState<number>(2025);
    const [month, setMonth] = useState<number>(8);
    const [achievementDates, setAchievementDates] = useState<{ [date: string]: number }>({});

    useEffect(() =>
    {
        const now = new Date();
        setToday(now);
        setYear(now.getFullYear());
        setMonth(now.getMonth());
    }, []);

    const days = getMonthDays(year, month);

    // --- APIからタスク一覧を取得する処理 ---
    useEffect(() =>
    {
        const fetchItems = async () =>
        {
            try
            {
                const response = await fetch(`${API_URL}/items`);
                if (!response.ok) throw new Error('アイテム取得失敗');
                const data = await response.json() as Item[];
                // DBから取得したitemsをコンソール出力
                console.log('DB items:', data);
                // persistentタスクも必ずpersistentフラグで判定
                let persistentTasks = data.filter(item => item.persistent === true).map(item => ({ ...item, status: false, persistent: true, is_custom: item.is_custom }));
                // DBに存在しないpersistentタスクは仮追加
                persistentTaskTitles.forEach((title, idx) =>
                {
                    if (!data.find(item => item.title === title && item.persistent === true))
                    {
                        persistentTasks.push({ id: -(idx + 1), title, status: false, persistent: true, is_custom: false });
                    }
                });
                // 今日だけやること: persistent: false のみ
                const normalTasks = data.filter(item => item.persistent === false).map(item => ({ ...item, status: false, persistent: false, is_custom: item.is_custom }));
                setTasks([...persistentTasks, ...normalTasks].map(task => ({
                    ...task,
                    is_custom: typeof task.is_custom === "boolean" ? task.is_custom : false
                })).filter(task => typeof task.id === "number" && typeof task.title === "string"));
            } catch (error)
            {
                console.error("アイテム取得エラー:", error);
            }
        };
        fetchItems();
    }, []);

    // --- 新しいタスクを追加する処理 ---
    const [isPersistentNewTask, setIsPersistentNewTask] = useState(false); // タスク追加時の種別選択（true:毎日やること, false:今日だけやること）

    const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) =>
    {
        e.preventDefault();
        if (!newItemTitle.trim()) return;
        try
        {
            const response = await fetch(`${API_URL}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newItemTitle, is_custom: !isPersistentNewTask, persistent: isPersistentNewTask }),
            });
            if (!response.ok) throw new Error('タスクの追加に失敗しました。');
            const newItem = await response.json();
            setTasks([...tasks, { ...newItem, status: false, persistent: newItem.persistent ?? isPersistentNewTask }]);
            setNewItemTitle('');
        } catch (error)
        {
            // ...error処理...
        }
    };

    // --- チェックボックスの状態を変更する処理 ---
    function handleTaskCheckChange(id: number)
    {
        setTasks(tasks.map(task => task.id === id ? { ...task, status: !task.status } : task));
    }

    // --- 達成状況をサーバーに保存する処理 ---
    const handleSave = async () =>
    {
        const todayStr = new Date().toISOString().split('T')[0];
        // チェックが付いているタスク全て（idの正負問わず）をPOST
        const validTasks = tasks.filter(task => task.status);
        const payload = {
            date: todayStr,
            items: validTasks.map(({ id, status, title, persistent }) => ({
                item_id: id > 0 ? id : 0, // 仮persistentタスクはitem_id: 0
                status,
                persistent,
                title,
                date: todayStr
            }))
        };
        try
        {
            const response = await fetch(`${API_URL}/achievements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('記録の保存に失敗しました。');
            const achievement = await response.json();
            setAchievementId(achievement.id);
            setRevealedQuotes(achievement.quotes || []);
            // 名言権利数はチェックが付いているタスク全てでカウント
            const checkedCount = validTasks.length;
            const remainingChances = checkedCount - (achievement.quotes?.length || 0);
            setQuoteChances(remainingChances > 0 ? remainingChances : 0);
            setAchievementDates(prev => ({ ...prev, [todayStr]: achievement.completed_count }));
            setSelectedDate(todayStr);
            // --- 修正: status:trueのtasks全てをhistory.tasksに表示する ---
            const allCheckedTasks = tasks.filter(task => task.status).map(task => task.title);
            setHistory({
                tasks: allCheckedTasks,
                quotes: achievement.quotes || [],
            });
        } catch (error)
        {
            console.error("保存処理エラー:", error);
        }
    };

    const handleGetQuoteClick = async () =>
    {
        if (!achievementId || quoteChances <= 0) return;

        setIsLoadingQuote(true); // ローディング開始
        setError(null);

        try
        {
            // 名言を1つだけ取得・保存する新しいAPIを呼び出す
            const response = await fetch(`${API_URL}/achievements/quotes?achievement_id=${achievementId}`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('名言の取得に失敗しました。');

            const newQuote: Quote = await response.json();

            // --- Stateを更新 ---
            setRevealedQuotes(prev => [...prev, newQuote]); // 表示済みリストに新しい名言を追加
            setQuoteChances(prev => prev - 1); // 残り回数を1減らす
            // historyにも名言を追加
            setHistory(prev => prev ? { ...prev, quotes: [...prev.quotes, newQuote] } : null);
        } catch (error)
        {
            console.error("名言取得エラー:", error);
            setError(error instanceof Error ? error.message : String(error));
        } finally
        {
            setIsLoadingQuote(false); // ローディング終了
        }
    };

    // カレンダー（日付選択）でその日の達成記録・名言をAPIから取得し表示
    const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        const date = e.target.value;
        setSelectedDate(date);
        setRevealedQuotes([]); // 日付変更時に名言stateをリセット
        // チェック状態もリセット（tasksはAPI再取得で初期化される想定）
        try
        {
            const response = await fetch(`${API_URL}/achievements/${date}`);
            if (!response.ok) throw new Error("記録取得失敗");
            const achievement = await response.json();
            setHistory({
                tasks: achievement.items.filter((item: any) => item.status).map((item: any) => item.title || item.item_id),
                quotes: achievement.quotes || [],
            });
        } catch (err)
        {
            setHistory(null);
        }
    };

    // カレンダーで日付選択→APIからその日の記録取得
    const handleCalendarClick = async (day: number) =>
    {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        setSelectedDate(dateStr);
        setRevealedQuotes([]); // 日付変更時に名言stateをリセット
        // ダミーデータ利用: 2025-09-11 の場合はダミー履歴をセット
        if (dateStr === "2025-09-11")
        {
            setHistory({
                tasks: dummyHistory["2025-09-11"].tasks,
                quotes: dummyHistory["2025-09-11"].quotes,
            });
            return;
        }
        try
        {
            const response = await fetch(`${API_URL}/achievements/${dateStr}`);
            if (!response.ok) throw new Error("記録取得失敗");
            const achievement = await response.json();
            let apiTasks = achievement.items.filter((item: any) => item.status).map((item: any) => item.title ?? item.item?.title ?? `タスクID:${item.item_id}`);
            // --- 修正: is_custom=falseかつpersistent=trueの初期タスクもhistory.tasksに必ず追加 ---
            const extraInitialTasks = tasks.filter(task => task.status && task.persistent && (task as any).is_custom === false && task.id > 0 && !apiTasks.includes(task.title)).map(task => task.title);
            // 今日の日付の場合のみ仮persistentタスク（id < 0, status: true, persistent: true）も追加
            const todayStr = new Date().toISOString().split('T')[0];
            if (dateStr === todayStr)
            {
                const extraTasks = tasks.filter(task => task.id < 0 && task.status && task.persistent).map(task => task.title);
                apiTasks = [...apiTasks, ...extraTasks];
            }
            setHistory({
                tasks: [...apiTasks, ...extraInitialTasks],
                quotes: achievement.quotes || [],
            });
        } catch (err)
        {
            setHistory(null);
        }
    };

    useEffect(() =>
    {
        window.scrollTo({ top: 0, behavior: "auto" });
    }, []);

    useEffect(() =>
    {
        // 月初から月末までの達成記録を一括取得（API設計により要調整）
        const fetchAchievements = async () =>
        {
            const yearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
            try
            {
                const response = await fetch(`${API_URL}/achievements?month=${yearMonth}`); // 例: /achievements?month=2025-09
                if (!response.ok) return;
                const achievements = await response.json();
                // achievements: [{date: "2025-09-11", completed_count: 3}, ...]
                const map: { [date: string]: number } = {};
                achievements.forEach((a: any) =>
                {
                    map[a.date] = a.completed_count;
                });
                // ダミーデータ分も追加
                map["2025-09-11"] = dummyHistory["2025-09-11"].tasks.length;
                setAchievementDates(map);
            } catch { }
        };
        fetchAchievements();
    }, [year, month]);

    // カレンダーで日付セルの色を決定
    function getCellColor(dateStr: string)
    {
        const count = achievementDates[dateStr] || 0;
        if (count === 0) return "";
        // 1~5個で色の濃さを変える（最大5段階）
        const alpha = Math.min(0.2 + count * 0.15, 0.8);
        return `rgba(33, 150, 243, ${alpha})`;
    }

    function getCellMark(dateStr: string)
    {
        return achievementDates[dateStr] ? "●" : "";
    }
    // --- 表示部 ---
    return (
        <div className="container">
            <h1>じぶん記録</h1>
            <section className="task-section">
                <h2>毎日やること</h2>
                <PersistentTaskSection tasks={tasks} handleTaskCheckChange={handleTaskCheckChange} />
                <h2 style={{ marginTop: "2rem" }}>今日だけやること</h2>
                <NormalTaskSection tasks={tasks} handleTaskCheckChange={handleTaskCheckChange} />
                <form onSubmit={handleAddTask} style={{ marginTop: "1rem" }}>
                    <input
                        type="text"
                        id="new-task-title"
                        name="new-task-title"
                        value={newItemTitle}
                        onChange={e => setNewItemTitle(e.target.value)}
                        placeholder="新しい項目を追加"
                    />
                    <label style={{ marginLeft: "1rem" }}>
                        <input
                            type="radio"
                            name="taskType"
                            value="persistent"
                            checked={isPersistentNewTask}
                            onChange={() => setIsPersistentNewTask(true)}
                        />毎日やること
                    </label>
                    <label style={{ marginLeft: "1rem" }}>
                        <input
                            type="radio"
                            name="taskType"
                            value="once"
                            checked={!isPersistentNewTask}
                            onChange={() => setIsPersistentNewTask(false)}
                        />今日だけやること
                    </label>
                    <button type="submit">追加</button>
                    {error && <div style={{ color: 'red', marginTop: '0.5rem' }}>{error}</div>}
                </form>
                <button onClick={handleSave} className="save-button" style={{ marginTop: "1rem" }}>
                    達成を記録する
                </button>
                <QuoteSection
                    achievementId={achievementId}
                    quoteChances={quoteChances}
                    isLoadingQuote={isLoadingQuote}
                    error={error}
                    revealedQuotes={revealedQuotes}
                    handleGetQuoteClick={handleGetQuoteClick}
                />
            </section>

            {/* ▼▼▼ 過去の記録セクション ▼▼▼ */}
            <section style={{ marginTop: "2rem" }}>
                <h2>過去の記録を見る</h2>
                <CalendarSection
                    year={year}
                    month={month}
                    setYear={setYear}
                    setMonth={setMonth}
                    days={days}
                    achievementDates={achievementDates}
                    selectedDate={selectedDate}
                    handleCalendarClick={handleCalendarClick}
                />
                {selectedDate && (
                    history ? (
                        <div style={{ marginTop: "1rem", textAlign: "left" }}>
                            <h3>{selectedDate}のやったこと</h3>
                            {history.tasks.length > 0 ? (
                                <ul>
                                    {history.tasks.map((t, i) => <li key={i}>{t}</li>)}
                                </ul>
                            ) : (
                                <div>やったことはありません</div>
                            )}
                            <h3>名言</h3>
                            {history.quotes.length > 0 ? (
                                history.quotes.map((q, i) => <QuoteDisplay key={i} quote={q} />)
                            ) : (
                                <div>名言はありません</div>
                            )}
                        </div>
                    ) : (
                        <div style={{ marginTop: "1rem", textAlign: "left" }}>記録はありません</div>
                    )
                )}
            </section>
        </div>
    );
}
