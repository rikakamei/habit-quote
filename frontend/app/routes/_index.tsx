import { useEffect, useState } from "react";
import { json } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import QuoteDisplay from "~/components/QuoteDisplay";

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
}
interface Task extends Item {
    status: boolean;
    persistent: boolean;
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
    { id: 101, title: "水を飲む", status: false, persistent: false },
    { id: 102, title: "ストレッチ", status: false, persistent: false },
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
            // DBに存在するpersistentタスク
            const persistentTasks = persistentTaskTitles
                .map(title => items.find(item => item.title === title))
                .filter(Boolean)
                .map(item => ({ ...item, status: false, persistent: false }));
            // DBに存在しない場合は仮で追加
            persistentTaskTitles.forEach((title, idx) =>
            {
                if (!items.find(item => item.title === title))
                {
                    allTasks.push({ id: -(idx + 1), title, status: false, persistent: false });
                }
            });
            // 通常タスク
            const normalTasks = items.filter(item => !persistentTaskTitles.includes(item.title)).map(item => ({ ...item, status: false, persistent: false }));
            allTasks = [...persistentTasks, ...normalTasks, ...allTasks];
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
                // persistentタスクも必ず含める
                let persistentTasks = persistentTaskTitles
                    .map(title => data.find(item => item.title === title))
                    .filter((item): item is Item => !!item)
                    .map(item => ({ ...item, status: false, persistent: item.persistent ?? true }));
                // DBに存在しないpersistentタスクは仮追加
                persistentTaskTitles.forEach((title, idx) => {
                    if (!data.find(item => item.title === title)) {
                        persistentTasks.push({ id: -(idx + 1), title, status: false, persistent: true });
                    }
                });
                // 通常タスク
                const normalTasks = data.filter(item => !persistentTaskTitles.includes(item.title)).map(item => ({ ...item, status: false, persistent: item.persistent ?? false }));
                setTasks([...persistentTasks, ...normalTasks].filter((task): task is Task => typeof task.id === "number" && typeof task.title === "string"));
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
        const today = new Date().toISOString().split('T')[0];
        // DBに存在するid（id > 0）のみPOST
        const validTasks = tasks.filter(task => task.id > 0);
        const payload = {
            date: today,
            items: validTasks.map(({ id, status, title }) => ({
                item_id: id,
                status: status,
                persistent: persistentTaskTitles.includes(title)
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
            const achievement: Achievement = await response.json();
            setAchievementId(achievement.id);
            setRevealedQuotes(achievement.quotes || []);
            // 名言権利数はDBに存在するタスク（id > 0）でstatus:trueのものだけカウント
            const checkedCount = validTasks.filter(task => task.status).length;
            const remainingChances = checkedCount - (achievement.quotes?.length || 0);
            setQuoteChances(remainingChances > 0 ? remainingChances : 0);
            const todayStr = new Date().toISOString().split('T')[0];
            setAchievementDates(prev => ({ ...prev, [todayStr]: achievement.completed_count }));
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
        try
        {
            const response = await fetch(`${API_URL}/achievements/${dateStr}`);
            if (!response.ok) throw new Error("記録取得失敗");
            const achievement = await response.json();
            setHistory({
                tasks: achievement.items.filter((item: any) => item.status).map((item: any) => item.title ?? item.item?.title ?? `タスクID:${item.item_id}`),
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
                <ul className="task-list">
                    {tasks.filter(task => task.persistent).map(task => (
                        <li key={task.id}>
                            <input
                                type="checkbox"
                                id={`task-${task.id}`}
                                checked={task.status}
                                onChange={() => handleTaskCheckChange(task.id)}
                            />
                            <label htmlFor={`task-${task.id}`}>{task.title}</label>
                        </li>
                    ))}
                </ul>
                <h2 style={{ marginTop: "2rem" }}>今日だけやること</h2>
                <ul className="task-list">
                    {tasks.filter(task => !task.persistent).map(task => (
                        <li key={task.id}>
                            <input
                                type="checkbox"
                                id={`task-${task.id}`}
                                checked={task.status}
                                onChange={() => handleTaskCheckChange(task.id)}
                            />
                            <label htmlFor={`task-${task.id}`}>{task.title}</label>
                        </li>
                    ))}
                </ul>
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
                </form>
                <button onClick={handleSave} className="save-button" style={{ marginTop: "1rem" }}>
                    達成を記録する
                </button>
            </section>

            {/* ▼▼▼ 名言表示セクションのUIを修正 ▼▼▼ */}
            <section className="quote-section">
                {/* achievementId がある場合（一度でも記録された後）に表示 */}
                {achievementId && (
                    <div className="reveal-quote-controls">
                        <button
                            onClick={handleGetQuoteClick}
                            disabled={quoteChances <= 0 || isLoadingQuote}
                            className="save-button"
                        >
                            {isLoadingQuote ? "取得中..." : "名言を見る"}
                        </button>
                        <span style={{ marginLeft: '1rem' }}>
                            （残り {quoteChances} 回）
                        </span>
                    </div>
                )}
                {error && <div style={{ color: "red" }}>{error}</div>}
                <QuoteDisplay quote={revealedQuotes.length > 0 ? revealedQuotes[revealedQuotes.length - 1] : null} />
            </section>

            {/* ▼▼▼ 過去の記録セクション ▼▼▼ */}
            <section style={{ marginTop: "2rem" }}>
                <h2>過去の記録を見る</h2>
                <table style={{ borderCollapse: "collapse", margin: "1rem 0" }}>
                    <thead>
                        <tr>
                            <th colSpan={7}>{year}年{month + 1}月</th>
                        </tr>
                        <tr>
                            {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => <th key={i}>{w}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {(() =>
                        {
                            const firstDayOfWeek = new Date(year, month, 1).getDay();
                            const rows: JSX.Element[] = [];
                            let cells: JSX.Element[] = [];
                            for (let i = 0; i < firstDayOfWeek; i++)
                            {
                                cells.push(<td key={"empty-" + i}></td>);
                            }
                            days.forEach((day, idx) =>
                            {
                                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                const isSelected = selectedDate.endsWith(`-${String(day).padStart(2, "0")}`);
                                cells.push(
                                    <td key={day}
                                        style={{
                                            padding: "0.5rem",
                                            cursor: "pointer",
                                            background: isSelected ? "#e0f7fa" : undefined,
                                            color: undefined,
                                            textAlign: "center"
                                        }}
                                        onClick={() => handleCalendarClick(day)}>
                                        {achievementDates[dateStr]
                                            ? <span className="circle-day">{day}</span>
                                            : day}
                                    </td>
                                );
                                if ((cells.length) % 7 === 0 || day === days.length)
                                {
                                    rows.push(<tr key={day}>{cells}</tr>);
                                    cells = [];
                                }
                            });
                            if (cells.length) rows.push(<tr key="last-row">{cells}</tr>);
                            return rows;
                        })()}
                    </tbody>
                </table>
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
