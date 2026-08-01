import "./App.css";
import type { User, Course, Submission } from "./types/index";
import { useState, useEffect, useRef } from "react";
import UserCard from "./components/UserCard";
import CourseCard from "./components/CourseCard";
import useToggle from "./hooks/useToggle";
import usePrevious from "./hooks/usePrevious";

// Mock User
const user: User = {
  id: 1,
  name: "Jane Allyson L. Paray",
  email: "jane.allyson@example.com",
  role: "student",
  isActive: true,
};

// Mock Course
const course: Course = {
  code: "ITEL4-101",
  title: "IT Elective 4: System Development",
  units: 3,
  semester: "2nd Semester AY 2026-2027",
};

// Mock Submission
const submission: Submission = {
  id: 101,
  studentId: user.id,
  courseCode: course.code,
  repoUrl: "https://github.com/JaneAllysonParay/itelect4-project.git",
  submittedAt: new Date("2026-07-20T14:30:00"),
  score: 95, // optional, but included here
};

function App() {
  // useState<T> -- T is the type of the state value
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Array state -- starts empty, filled after "loading"
  const [courses, setCourses] = useState<Course[]>([]);
  // Boolean state -- tracks whether data has finished loading
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [count, setCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showDetails, toggleDetails] = useToggle(false);
  const previousSearch = usePrevious(searchTerm);
  // useRef<T>(null) -- T is the DOM element type
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isDarkMode, toggleDarkMode] = useToggle(false);
  const [isError, setIsError] = useState<boolean>(false);

  // Focus the input programmatically (e.g. after loading finishes)
  const focusSearch = (): void => {
    searchInputRef.current?.focus();
  };

  // useEffect(fn, deps) -- fn runs after render;
  // an empty deps array [] means "run once, on mount"
  useEffect(() => {
    setTimeout(() => {
      // Reusing GT1's course mock data as the “fetched” result
      setCourses([course]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void =>
    setSearchTerm(e.target.value);

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  if (isLoading) {
    return (
      <div className="animate-pulse p-6 text-gray-500">Loading courses...</div>
    );
  }
  if (isError) {
    // <-- NEW block
    return (
      <div className="m-6 rounded-lg bg-red-50 p-4 text-red-700">
        Could not load courses. Please try again.
      </div>
    );
  }

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
        <input
          ref={searchInputRef}
          value={searchTerm}
          type="text"
          placeholder="Search courses..."
          onChange={handleSearchChange}
        />
        {previousSearch !== undefined && previousSearch !== searchTerm && (
          <p>Previous search: "{previousSearch}"</p>
        )}
        <button
          onClick={toggleDarkMode}
          className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white 
        dark:bg-gray-200 dark:text-gray-900"
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
        <div
          className="mt-6 grid grid-cols-1 gap-4 // <-- NEW grid wrapper
sm:grid-cols-2 lg:grid-cols-3"
        >
          <UserCard user={user} onSelect={setSelectedUser} />
          {selectedUser && <p>Selected: {selectedUser.name}</p>}
          <button onClick={toggleDetails}>
            {showDetails ? "Hide" : "Show"} Details
          </button>
          {filteredCourses.map((c) => (
            <CourseCard key={c.code} course={c} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
