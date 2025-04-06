import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  InputAdornment,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Tooltip,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  Avatar,
  Popover,
} from "@mui/material";
import {
  Book as BookIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Search as SearchIcon,
  LibraryBooks as LibraryBooksIcon,
  EventNote as EventNoteIcon,
  Autorenew as AutorenewIcon,
  AssignmentReturn as ReturnIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  QrCode as QrCodeIcon,
  QrCodeScanner as QrCodeScannerIcon,
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon,
  LocationOn as LocationOn,
  Delete,
  Receipt as ReceiptIcon,
  AssignmentReturned as AssignmentReturnedIcon,
  Settings as SettingsIcon,
  Camera as CameraIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import QRCode from "qrcode";
import jsQR from "jsqr";

const LoanManagement = () => {
  const receiptRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [bookSearchTerm, setBookSearchTerm] = useState("");
  const [openBorrowDialog, setOpenBorrowDialog] = useState(false);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [openMemberSelectDialog, setOpenMemberSelectDialog] = useState(false);
  const [openBookSelectDialog, setOpenBookSelectDialog] = useState(false);
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // State for new borrow dialog
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [checkoutDate, setCheckoutDate] = useState(
    new Date().toISOString().split("T")[0]
  ); // YYYY-MM-DD format
  const [dueDate, setDueDate] = useState(
    (() => {
      const date = new Date();
      date.setDate(date.getDate() + 14); // Add 14 days
      return date.toISOString().split("T")[0]; // YYYY-MM-DD format
    })()
  );

  // State for return dialog
  const [selectedLoans, setSelectedLoans] = useState([]);

  const [openQRScannerDialog, setOpenQRScannerDialog] = useState(false);
  const [qrScannerActive, setQRScannerActive] = useState(false);
  const [scannerResult, setScannerResult] = useState(null);
  const videoRef = useRef(null);
  const [qrCodeData, setQrCodeData] = useState("");
  const canvasRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const currentStreamRef = useRef(null);

  // Add a manual entry option for QR data
  const [manualQRInput, setManualQRInput] = useState("");

  // Add new state for database repair status
  const [isRepairing, setIsRepairing] = useState(false);

  // Add new state for selected book copy ID
  const [selectedBookCopyId, setSelectedBookCopyId] = useState("");

  // Add new state for loan clearing confirmation dialog
  const [openClearLoansDialog, setOpenClearLoansDialog] = useState(false);
  const [isClearingLoans, setIsClearingLoans] = useState(false);

  // Add these new state variables
  const [openCopySelectDialog, setOpenCopySelectDialog] = useState(false);
  const [availableCopiesByBook, setAvailableCopiesByBook] = useState({});
  const [selectedBookCopies, setSelectedBookCopies] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);

  // Add state for QR popup
  const [qrPopoverAnchor, setQrPopoverAnchor] = useState(null);
  const [currentLoanQR, setCurrentLoanQR] = useState(null);

  const handleManualQRSubmit = () => {
    if (manualQRInput.trim() === "") {
      setScannerResult("Please enter QR code data");
      return;
    }

    try {
      // Try to process the input in various formats
      let processedInput = manualQRInput.trim();

      // If it's a URL or contains URL encoded data, try to extract
      if (processedInput.includes("%")) {
        try {
          processedInput = decodeURIComponent(processedInput);
        } catch (e) {
          console.log("Not a URL encoded string");
        }
      }

      // Try to parse as JSON if it looks like JSON
      if (
        (processedInput.startsWith("{") && processedInput.endsWith("}")) ||
        (processedInput.startsWith("[") && processedInput.endsWith("]"))
      ) {
        try {
          // Validate if it's parseable JSON but keep as string
          JSON.parse(processedInput);
        } catch (e) {
          console.log("Invalid JSON format:", e);
        }
      }

      // For QR codes from loan receipts, they might start with LOAN- or contain specific patterns
      // Allow direct ID entry for simplicity
      if (/^\d+$/.test(processedInput)) {
        processedInput = JSON.stringify({
          loansIds: [parseInt(processedInput)],
        });
      }

      handleScannedQRCode(processedInput);
    } catch (error) {
      console.error("Error processing manual QR input:", error);
      setScannerResult("Invalid QR code data format");
    }
  };

  // Function to clear all loans
  const handleClearAllLoans = async () => {
    try {
      setIsClearingLoans(true);
      // The correct path is just window.api.clearLoans() for the legacy API structure
      const result = await window.api.clearLoans();

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Successfully cleared all loans. ${result.message}`,
          severity: "success",
        });

        // Refresh loans list
        fetchLoansByTab(activeTab);
      } else {
        setSnackbar({
          open: true,
          message: `Failed to clear loans: ${result.error || "Unknown error"}`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error clearing loans:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to clear loans"}`,
        severity: "error",
      });
    } finally {
      setIsClearingLoans(false);
      setOpenClearLoansDialog(false);
    }
  };

  // Function to open clear loans confirmation dialog
  const handleOpenClearLoansDialog = () => {
    setOpenClearLoansDialog(true);
  };

  // Function to close clear loans confirmation dialog
  const handleCloseClearLoansDialog = () => {
    setOpenClearLoansDialog(false);
  };

  // Debug function to show the current camera view as an image
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw scanning overlay for reference
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 4;

    // Draw scan region indicator
    const scanWidth = Math.floor(canvas.width * 0.6);
    const scanHeight = Math.floor(canvas.height * 0.6);
    const startX = Math.floor((canvas.width - scanWidth) / 2);
    const startY = Math.floor((canvas.height - scanHeight) / 2);

    ctx.strokeRect(startX, startY, scanWidth, scanHeight);

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL("image/png");

    // Set to state to display in dialog
    setDebugImage(imageDataUrl);
    setShowDebugImage(true);
  };

  const [debugImage, setDebugImage] = useState(null);
  const [showDebugImage, setShowDebugImage] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch all active loans
        const loansData = await window.api.getActiveLoans();
        setLoans(loansData);

        // Fetch all members
        const membersData = await window.api.getAllMembers();
        setMembers(membersData);

        // Fetch all books
        const booksData = await window.api.getAllBooks();
        setBooks(booksData);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSnackbar({
          open: true,
          message: "Failed to load data",
          severity: "error",
        });
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Add logging to inspect loan data when it updates
  useEffect(() => {
    if (loans.length > 0) {
      console.log("Loans data loaded:", loans);
      console.log("First loan sample:", loans[0]);
    }
  }, [loans]);

  // Check if we're being redirected from a book details page with a specific copy to borrow
  const storedBookCopyId = localStorage.getItem("selectedBookCopyId");
  const redirectToBorrow = localStorage.getItem("redirectToBorrow");

  if (storedBookCopyId && redirectToBorrow === "true") {
    handleDirectCopyBorrow(storedBookCopyId);

    // Clear the localStorage flags
    localStorage.removeItem("selectedBookCopyId");
    localStorage.removeItem("redirectToBorrow");
  }

  // Handle borrowing a specific book copy
  const handleDirectCopyBorrow = async (copyId) => {
    try {
      // 1. First get the book copy details
      const bookCopy = await window.api.getBookCopyById(copyId);
      if (!bookCopy) {
        throw new Error(`Book copy with ID ${copyId} not found`);
      }

      // 2. Get the book details
      const book = await window.api.getBookById(bookCopy.book_id);

      // 3. Open the borrow dialog
      handleOpenBorrowDialog();

      // 4. Set the selected book
      setSelectedBooks([book]);

      // 5. Show notification that we need to select a member to complete the borrow process
      setSnackbar({
        open: true,
        message: "Please select a member to borrow this book copy",
        severity: "info",
      });

      // 6. Store the specific copy ID to be used when borrowing
      setSelectedBookCopyId(copyId);
    } catch (error) {
      console.error("Error initializing direct book copy borrow:", error);
      setSnackbar({
        open: true,
        message: `Error: ${
          error.message || "Failed to initialize borrowing process"
        }`,
        severity: "error",
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    fetchLoansByTab(newValue);
  };

  const fetchLoansByTab = async (tabIndex) => {
    setLoading(true);
    try {
      let loansData;
      switch (tabIndex) {
        case 0: // All active loans
          loansData = await window.api.getActiveLoans();
          break;
        case 1: // Overdue loans
          loansData = await window.api.getOverdueLoans();
          break;
        default:
          loansData = await window.api.getAllLoans();
      }

      // Check and fix any missing book_id fields in the loans
      const fixedLoansData = await ensureCompleteLoansData(loansData);

      setLoans(fixedLoansData);
    } catch (error) {
      console.error("Error fetching loans:", error);
      setSnackbar({
        open: true,
        message:
          "Failed to load loans. The database schema might need to be updated.",
        severity: "error",
      });
      // Set empty array to prevent further errors
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to ensure loan data has all needed fields
  const ensureCompleteLoansData = async (loansData) => {
    if (!loansData || loansData.length === 0) return loansData;

    // Check if any loan is missing book_id
    const incompleteLoans = loansData.filter((loan) => !loan.book_id);

    if (incompleteLoans.length === 0) {
      // All loans have book_id, no need to fix
      return loansData;
    }

    console.log(
      `Found ${incompleteLoans.length} loans with missing book_id, fixing...`
    );

    // For each incomplete loan, get the book_copy and use it to find the book
    const fixedLoans = await Promise.all(
      loansData.map(async (loan) => {
        if (loan.book_id) return loan; // Already has book_id

        try {
          // Get the book copy to find its book_id
          const bookCopy = await window.api.getBookCopyById(loan.book_copy_id);
          if (!bookCopy) {
            console.error(
              `Could not find book copy with ID ${loan.book_copy_id}`
            );
            return loan;
          }

          // ... [rest of the original file content remains unchanged]
        } catch (error) {
          console.error("Error initializing direct book copy borrow:", error);
          setSnackbar({
            open: true,
            message: `Error: ${
              error.message || "Failed to initialize borrowing process"
            }`,
            severity: "error",
          });
        }
      })
    );

    return fixedLoans;
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredLoans = loans.filter(
    (loan) =>
      loan.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.book_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loan.book_isbn && loan.book_isbn.includes(searchTerm))
  );

  const handleOpenBorrowDialog = () => {
    // Reset to today and today + 14 days
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    setSelectedMember(null);
    setSelectedBooks([]);
    setCheckoutDate(today);
    setDueDate(futureDateStr);
    setOpenBorrowDialog(true);
  };

  const handleCloseBorrowDialog = () => {
    setOpenBorrowDialog(false);
    // Reset the book copy ID when closing the dialog
    setSelectedBookCopyId("");
  };

  const handleOpenReturnDialog = () => {
    setSelectedLoans([]);
    setOpenReturnDialog(true);
  };

  const handleCloseReturnDialog = () => {
    setOpenReturnDialog(false);
  };

  // Function to handle opening copy selection dialog
  const handleOpenCopySelectDialog = async () => {
    if (!selectedMember) {
      setSnackbar({
        open: true,
        message: "Please select a member first",
        severity: "error",
      });
      return;
    }

    if (selectedBooks.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one book",
        severity: "error",
      });
      return;
    }

    try {
      setLoadingCopies(true);
      // Fetch available copies for each selected book
      const copiesData = {};
      const bookCopiesPromises = selectedBooks.map(async (book) => {
        // Get ALL copies of the book, not just availability summary
        const copies = await window.api.getBookCopiesByBookId(book.id);
        return { book, copies };
      });

      const results = await Promise.all(bookCopiesPromises);

      // Organize by book
      results.forEach(({ book, copies }) => {
        // Filter to only include available copies
        const availableCopies = copies.filter(
          (copy) => copy.status === "Available"
        );

        if (availableCopies && availableCopies.length > 0) {
          copiesData[book.id] = {
            book,
            copies: availableCopies,
          };
        } else {
          // Include the book even if no copies are available
          copiesData[book.id] = {
            book,
            copies: [],
          };
        }
      });

      setAvailableCopiesByBook(copiesData);

      // Clear previous selections
      setSelectedBookCopies([]);

      // Open the dialog
      setOpenCopySelectDialog(true);
    } catch (error) {
      console.error("Error fetching book copies:", error);
      setSnackbar({
        open: true,
        message: `Error fetching available copies: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoadingCopies(false);
    }
  };

  // Function to handle closing copy selection dialog
  const handleCloseCopySelectDialog = () => {
    setOpenCopySelectDialog(false);
  };

  // Function to toggle selection of a book copy
  const handleToggleCopySelection = (copyId) => {
    setSelectedBookCopies((prev) => {
      if (prev.includes(copyId)) {
        return prev.filter((id) => id !== copyId);
      } else {
        return [...prev, copyId];
      }
    });
  };

  // Function to select all copies of a book
  const handleSelectAllCopiesOfBook = (bookId) => {
    const bookData = availableCopiesByBook[bookId];
    if (bookData && bookData.copies) {
      const copyIds = bookData.copies.map((copy) => copy.id);
      setSelectedBookCopies((prev) => {
        const filtered = prev.filter(
          (id) => !bookData.copies.some((copy) => copy.id === id)
        );
        return [...filtered, ...copyIds];
      });
    }
  };

  // Function to proceed with borrowing after copy selection
  const handleCompleteBorrowing = async () => {
    if (selectedBookCopies.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one book copy",
        severity: "error",
      });
      return;
    }

    try {
      const memberData = {
        member_id: selectedMember.id,
        book_copies: selectedBookCopies,
        checkout_date: checkoutDate,
        due_date: dueDate,
      };

      const result = await window.api.borrowBooks(memberData);

      // Generate a unique transaction ID for QR code
      const transactionId = `LOAN-${Date.now()}-${selectedMember.id}`;

      // Get book details for the receipt
      const booksForReceipt = [];
      for (const bookId in availableCopiesByBook) {
        const bookData = availableCopiesByBook[bookId];
        const selectedCopiesForThisBook = bookData.copies.filter((copy) =>
          selectedBookCopies.includes(copy.id)
        );

        if (selectedCopiesForThisBook.length > 0) {
          booksForReceipt.push(bookData.book);
        }
      }

      // Prepare receipt data
      const receiptInfo = {
        transactionId,
        member: selectedMember,
        books: booksForReceipt,
        bookCopies: selectedBookCopies,
        checkoutDate,
        dueDate,
        loansIds: Array.isArray(result) ? result.map((loan) => loan.id) : [],
      };

      setReceiptData(receiptInfo);

      // Generate QR code
      await generateQRData(receiptInfo);

      // Show receipt
      setOpenReceiptDialog(true);

      setSnackbar({
        open: true,
        message: `${selectedBookCopies.length} book copies borrowed successfully`,
        severity: "success",
      });

      // Close the copy select dialog
      setOpenCopySelectDialog(false);

      // Refresh the loans list
      fetchLoansByTab(activeTab);

      // Refresh available books
      const updatedBooks = await window.api.getAllBooks();
      setBooks(updatedBooks);

      // Close the borrow dialog
      setOpenBorrowDialog(false);

      // Reset state
      setSelectedMember(null);
      setSelectedBooks([]);
      setSelectedBookCopies([]);
    } catch (error) {
      console.error("Error borrowing books:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to borrow books"}`,
        severity: "error",
      });
    }
  };

  // Update the existing handleBorrowBooks function to call the copy selection dialog
  const handleBorrowBooks = async () => {
    if (!selectedMember) {
      setSnackbar({
        open: true,
        message: "Please select a member",
        severity: "error",
      });
      return;
    }

    if (selectedBookCopies.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one book copy",
        severity: "error",
      });
      return;
    }

    try {
      const memberData = {
        member_id: selectedMember.id,
        book_copies: selectedBookCopies,
        checkout_date: checkoutDate,
        due_date: dueDate,
      };

      const result = await window.api.borrowBooks(memberData);

      // Generate a unique transaction ID for QR code
      const transactionId = `LOAN-${Date.now()}-${selectedMember.id}`;

      // Get book details for the receipt
      const booksForReceipt = [];
      for (const bookId in availableCopiesByBook) {
        const bookData = availableCopiesByBook[bookId];
        const selectedCopiesForThisBook = bookData.copies.filter((copy) =>
          selectedBookCopies.includes(copy.id)
        );

        if (selectedCopiesForThisBook.length > 0) {
          booksForReceipt.push(bookData.book);
        }
      }

      // Prepare receipt data
      const receiptInfo = {
        transactionId,
        member: selectedMember,
        books: booksForReceipt,
        bookCopies: selectedBookCopies,
        checkoutDate,
        dueDate,
        loansIds: Array.isArray(result) ? result.map((loan) => loan.id) : [],
      };

      setReceiptData(receiptInfo);

      // Generate QR code
      await generateQRData(receiptInfo);

      // Show receipt
      setOpenReceiptDialog(true);

      setSnackbar({
        open: true,
        message: `${selectedBookCopies.length} book copies borrowed successfully`,
        severity: "success",
      });

      // Refresh the loans list
      fetchLoansByTab(activeTab);

      // Refresh available books
      const updatedBooks = await window.api.getAllBooks();
      setBooks(updatedBooks);

      // Close the borrow dialog
      setOpenBorrowDialog(false);

      // Reset state
      setSelectedMember(null);
      setSelectedBooks([]);
      setSelectedBookCopies([]);
      setAvailableCopiesByBook({});
    } catch (error) {
      console.error("Error borrowing books:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to borrow books"}`,
        severity: "error",
      });
    }
  };

  const handleReturnBooks = async () => {
    if (selectedLoans.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one book to return",
        severity: "error",
      });
      return;
    }

    try {
      await window.api.returnBooks(selectedLoans.map((loan) => loan.id));
      setSnackbar({
        open: true,
        message: `Successfully returned ${selectedLoans.length} book(s)`,
        severity: "success",
      });
      fetchLoansByTab(activeTab);
      setOpenReturnDialog(false);
    } catch (error) {
      console.error("Error returning books:", error);
      setSnackbar({
        open: true,
        message: `Error returning books: ${error.message}`,
        severity: "error",
      });
    }
  };

  // Handle returning a single book directly from the table
  const handleReturnSingleBook = async (loanId) => {
    try {
      if (!loanId) {
        console.error("Error: Missing loan ID");
        setSnackbar({
          open: true,
          message: "Error: Missing loan ID",
          severity: "error",
        });
        return;
      }

      console.log("Returning loan with ID:", loanId);
      await window.api.returnBooks([loanId]);
      setSnackbar({
        open: true,
        message: "Book successfully returned",
        severity: "success",
      });
      fetchLoansByTab(activeTab);
    } catch (error) {
      console.error("Error returning book:", error);
      setSnackbar({
        open: true,
        message: `Error returning book: ${error.message || "Unknown error"}`,
        severity: "error",
      });
    }
  };

  // Generate receipt for a single loan
  const handleGenerateReceipt = async (loan) => {
    try {
      if (!loan) {
        console.error("Error: Missing loan data");
        setSnackbar({
          open: true,
          message: "Error: Missing loan data",
          severity: "error",
        });
        return;
      }

      console.log("Generating receipt for loan:", loan);

      // Create book object from loan data
      const book = {
        id: loan.book_id,
        title: loan.book_title,
        author: loan.book_author,
        isbn: loan.book_isbn,
        cover_color: loan.book_color,
        front_cover: loan.book_cover,
      };

      // Create member object from loan data
      const member = {
        id: loan.member_id,
        name: loan.member_name,
        email: loan.member_email,
      };

      // Prepare receipt data
      const receiptInfo = {
        transactionId: `LOAN-${Date.now()}-${loan.member_id}`,
        member: member,
        checkoutDate: loan.checkout_date,
        dueDate: loan.due_date,
        books: [book],
        bookCopies: [
          {
            id: loan.book_copy_id,
            barcode: loan.book_barcode,
            locationCode: loan.book_location_code,
          },
        ],
      };

      setReceiptData(receiptInfo);

      // Generate QR code data
      await generateQRData(receiptInfo);

      // Show receipt
      setOpenReceiptDialog(true);
    } catch (error) {
      console.error("Error generating receipt:", error);
      setSnackbar({
        open: true,
        message: `Error generating receipt: ${
          error.message || "Unknown error"
        }`,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getAvailableBooks = () => {
    return books.filter((book) => book.status === "Available");
  };

  const getBookCoverDisplay = (book) => {
    if (!book) return null;

    if (book.front_cover) {
      return (
        <Box
          component="img"
          src={book.front_cover}
          alt={`Cover for ${book.title}`}
          sx={{
            width: 30,
            height: 45,
            objectFit: "cover",
            borderRadius: 1,
            mr: 1,
          }}
        />
      );
    } else {
      return (
        <Box
          sx={{
            width: 30,
            height: 45,
            bgcolor: book.cover_color || "#6B4226",
            borderRadius: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            fontSize: "7px",
            textAlign: "center",
            lineHeight: 1,
            p: 0.3,
            mr: 1,
          }}
        >
          {book.title}
        </Box>
      );
    }
  };

  const isLoanOverdue = (loan) => {
    if (!loan.due_date) return false;
    const today = new Date();
    const dueDate = new Date(loan.due_date);
    return dueDate < today;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderLoanStatus = (loan) => {
    if (isLoanOverdue(loan)) {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Overdue"
          color="error"
          size="small"
        />
      );
    }
    return <Chip label={loan.status} color="primary" size="small" />;
  };

  const handleCheckoutDateChange = (e) => {
    const newCheckoutDate = e.target.value;
    setCheckoutDate(newCheckoutDate);

    // Update due date to be 14 days after checkout date
    const checkoutDateObj = new Date(newCheckoutDate);
    const newDueDate = new Date(checkoutDateObj);
    newDueDate.setDate(newDueDate.getDate() + 14);
    setDueDate(newDueDate.toISOString().split("T")[0]);
  };

  const handleOpenMemberSelectDialog = () => {
    setMemberSearchTerm("");
    setOpenMemberSelectDialog(true);
  };

  const handleCloseMemberSelectDialog = () => {
    setOpenMemberSelectDialog(false);
  };

  // Update the handleOpenBookSelectDialog to directly show copies after book selection
  const handleOpenBookSelectDialog = () => {
    setOpenBookSelectDialog(true);
  };

  // Update the handleBookSelect to immediately fetch available copies
  const handleBookSelect = async (book) => {
    // Add the book to selectedBooks
    setSelectedBooks((prev) => {
      // Check if book is already selected
      if (prev.some((b) => b.id === book.id)) {
        return prev;
      }
      return [...prev, book];
    });

    // Immediately after selecting a book, fetch its available copies
    try {
      setLoadingCopies(true);
      // Get ALL copies of the book
      const copies = await window.api.getBookCopiesByBookId(book.id);

      // Filter to only available copies
      const availableCopies = copies.filter(
        (copy) => copy.status === "Available"
      );

      // Update the availableCopiesByBook state
      setAvailableCopiesByBook((prev) => ({
        ...prev,
        [book.id]: {
          book,
          copies: availableCopies || [],
        },
      }));
    } catch (error) {
      console.error("Error fetching book copies:", error);
      setSnackbar({
        open: true,
        message: `Error fetching available copies: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleCloseBookSelectDialog = () => {
    setOpenBookSelectDialog(false);
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setOpenMemberSelectDialog(false);
  };

  const handleRemoveBook = (bookId) => {
    // Remove the book from selectedBooks array
    setSelectedBooks(selectedBooks.filter((book) => book.id !== bookId));

    // Also remove any selected copies from this book
    if (availableCopiesByBook[bookId]?.copies) {
      const copyIdsToRemove = availableCopiesByBook[bookId].copies.map(
        (copy) => copy.id
      );
      setSelectedBookCopies((prev) =>
        prev.filter((copyId) => !copyIdsToRemove.includes(copyId))
      );
    }

    // Remove the book's entries from availableCopiesByBook
    setAvailableCopiesByBook((prev) => {
      const newState = { ...prev };
      delete newState[bookId];
      return newState;
    });
  };

  const handleMemberSearchChange = (event) => {
    setMemberSearchTerm(event.target.value);
  };

  const handleBookSearchChange = (event) => {
    setBookSearchTerm(event.target.value);
  };

  const filteredMembers = members.filter(
    (member) =>
      member.status === "Active" &&
      (member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchTerm.toLowerCase()))
  );

  const filteredAvailableBooks = getAvailableBooks().filter(
    (book) =>
      book.title.toLowerCase().includes(bookSearchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(bookSearchTerm.toLowerCase()) ||
      (book.isbn &&
        book.isbn.toLowerCase().includes(bookSearchTerm.toLowerCase()))
  );

  const handleCloseReceiptDialog = () => {
    setOpenReceiptDialog(false);
  };

  const handlePrintReceipt = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current;

      const printWindow = window.open("", "_blank");
      printWindow.document.write("<html><head><title>Loan Receipt</title>");
      printWindow.document.write("<style>");
      printWindow.document.write(`
        /* Thermal printer optimized styles */
        @page {
          size: 80mm auto; /* Standard thermal paper width */
          margin: 0;
        }
        body {
          font-family: 'Courier New', monospace; /* Standard for thermal printers */
          font-size: 12px;
          width: 80mm;
          padding: 5mm;
          margin: 0 auto;
        }
        .receipt {
          width: 100%;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 10px;
        }
        .library-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 3px;
        }
        .receipt-title {
          font-size: 14px;
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
        }
        .qr-section {
          text-align: center;
          margin: 10px 0;
        }
        .member-details, .loan-details {
          margin-bottom: 10px;
        }
        h3 {
          font-size: 13px;
          margin: 5px 0;
          border-bottom: 1px solid #000;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .book-list {
          margin-top: 5px;
        }
        .book-item {
          padding: 3px 0;
          border-bottom: 1px dotted #ccc;
        }
        .footer {
          margin-top: 15px;
          font-size: 11px;
          text-align: center;
          border-top: 1px dashed #000;
          padding-top: 5px;
        }
        .due-date {
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 11px;
        }
        th, td {
          padding: 4px;
          text-align: left;
          border-bottom: 1px dotted #ddd;
        }
        th {
          font-weight: bold;
        }
        @media print {
          body {
            width: 100%;
            padding: 0;
          }
          button { display: none; }
        }
      `);
      printWindow.document.write("</style></head><body>");
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write("</body></html>");

      printWindow.document.close();
      printWindow.focus();

      // Print after a short delay to ensure content is rendered
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Generate QR code data
  const generateQRData = async (data) => {
    if (!data) return "";

    try {
      const qrData = {
        transactionId: data.transactionId,
        memberId: data.member.id,
        memberName: data.member.name,
        loansIds: data.loansIds,
        checkoutDate: data.checkoutDate,
        dueDate: data.dueDate,
      };

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: "#000",
          light: "#FFF",
        },
      });

      setQrCodeData(qrDataUrl);
      return qrDataUrl;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return "";
    }
  };

  const handleScannedQRCode = async (qrData) => {
    stopQRScanner();

    try {
      setScannerResult("Processing QR code...");

      console.log("QR Data being processed:", qrData);

      // Try to fix common QR code issues before sending to API
      let processedData = qrData;

      // If it's a simple number (loan ID), convert to expected format
      if (/^\d+$/.test(processedData)) {
        processedData = JSON.stringify({ loansIds: [parseInt(processedData)] });
        console.log("Converted numeric ID to JSON format:", processedData);
      }

      // If it looks like JSON but isn't parsed yet
      if (
        typeof processedData === "string" &&
        (processedData.startsWith("{") || processedData.startsWith("["))
      ) {
        try {
          // Verify it's valid JSON by parsing and re-stringifying to clean it
          const jsonObj = JSON.parse(processedData);

          // If it's missing the loansIds field but has other identifiers
          if (!jsonObj.loansIds && jsonObj.transactionId) {
            console.log(
              "Found transaction without loan IDs, adding from receiptData if available"
            );
            // Try to use transactionId to identify the loan
            jsonObj.transactionType = "loan";
          }

          processedData = JSON.stringify(jsonObj);
        } catch (e) {
          console.log("Not valid JSON, using as-is:", e);
        }
      }

      const result = await window.api.returnBooksViaQR(processedData);

      if (result.success) {
        setScannerResult(result.message);
        setSnackbar({
          open: true,
          message: result.message,
          severity: "success",
        });

        // Refresh the loans list after a successful return
        setTimeout(() => {
          fetchLoansByTab(activeTab);
          handleCloseQRScannerDialog();
        }, 2000);
      } else {
        setScannerResult(`Error: ${result.message}`);
        setSnackbar({
          open: true,
          message: result.message,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setScannerResult("Failed to process QR code");
      setSnackbar({
        open: true,
        message: "Failed to process QR code",
        severity: "error",
      });
    }
  };

  const scanQRCode = () => {
    if (!qrScannerActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Only process if video is playing
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for QR detection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Try multiple scanning approaches
      let code = null;

      // Try to detect QR code in the original image first
      try {
        // Make a copy of the original image data for multiple attempts
        const originalImageData = new Uint8ClampedArray(imageData.data);

        // Attempt 1: Original image with aggressive settings
        code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
          canOverwriteImage: true,
        });

        if (code) {
          console.log("QR code detected in original image");
        } else {
          // Attempt 2: Try with binary threshold (higher contrast black and white)
          for (let i = 0; i < imageData.data.length; i += 4) {
            const avg =
              (imageData.data[i] +
                imageData.data[i + 1] +
                imageData.data[i + 2]) /
              3;
            const val = avg > 100 ? 255 : 0;
            imageData.data[i] =
              imageData.data[i + 1] =
              imageData.data[i + 2] =
                val;
          }

          code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
            canOverwriteImage: true,
          });

          if (code) {
            console.log("QR code detected with binary threshold");
          } else {
            // Restore original image data for next attempt
            for (let i = 0; i < imageData.data.length; i++) {
              imageData.data[i] = originalImageData[i];
            }

            // Attempt 3: Try with brightness boost
            for (let i = 0; i < imageData.data.length; i += 4) {
              // Boost brightness by 20%
              imageData.data[i] = Math.min(255, imageData.data[i] * 1.2);
              imageData.data[i + 1] = Math.min(
                255,
                imageData.data[i + 1] * 1.2
              );
              imageData.data[i + 2] = Math.min(
                255,
                imageData.data[i + 2] * 1.2
              );
            }

            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
              canOverwriteImage: true,
            });

            if (code) {
              console.log("QR code detected with brightness boost");
            } else {
              // Restore original image for next attempt
              for (let i = 0; i < imageData.data.length; i++) {
                imageData.data[i] = originalImageData[i];
              }

              // Attempt 4: Try scanning different sizes of the center region
              const attemptCenterRegions = [0.8, 0.6, 0.4];

              for (const regionSize of attemptCenterRegions) {
                if (code) break; // Stop if already found

                const centerWidth = Math.floor(imageData.width * regionSize);
                const centerHeight = Math.floor(imageData.height * regionSize);
                const startX = Math.floor((imageData.width - centerWidth) / 2);
                const startY = Math.floor(
                  (imageData.height - centerHeight) / 2
                );

                // Create new image data for the center region
                const centerImageData = ctx.createImageData(
                  centerWidth,
                  centerHeight
                );

                // Copy center region pixels
                for (let y = 0; y < centerHeight; y++) {
                  for (let x = 0; x < centerWidth; x++) {
                    const targetIndex = (y * centerWidth + x) * 4;
                    const sourceIndex =
                      ((startY + y) * imageData.width + (startX + x)) * 4;

                    centerImageData.data[targetIndex] =
                      imageData.data[sourceIndex];
                    centerImageData.data[targetIndex + 1] =
                      imageData.data[sourceIndex + 1];
                    centerImageData.data[targetIndex + 2] =
                      imageData.data[sourceIndex + 2];
                    centerImageData.data[targetIndex + 3] =
                      imageData.data[sourceIndex + 3];
                  }
                }

                code = jsQR(centerImageData.data, centerWidth, centerHeight, {
                  inversionAttempts: "attemptBoth",
                  canOverwriteImage: true,
                });

                if (code) {
                  console.log(
                    `QR code detected in ${regionSize * 100}% center region`
                  );

                  // Display the detected region for visual feedback
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = "#FF3B58";
                  ctx.strokeRect(startX, startY, centerWidth, centerHeight);
                }
              }

              // Attempt 5: Try adaptive thresholding if still no code found
              if (!code) {
                adaptiveThreshold(imageData);

                code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "attemptBoth",
                  canOverwriteImage: true,
                });

                if (code) {
                  console.log("QR code detected with adaptive threshold");
                }
              }
            }
          }
        }

        // If QR code is found in any attempt
        if (code) {
          console.log("QR code detected:", code.data);

          // Draw detection indicators
          if (code.location) {
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#FF3B58";
            ctx.beginPath();
            ctx.moveTo(
              code.location.topLeftCorner.x,
              code.location.topLeftCorner.y
            );
            ctx.lineTo(
              code.location.topRightCorner.x,
              code.location.topRightCorner.y
            );
            ctx.lineTo(
              code.location.bottomRightCorner.x,
              code.location.bottomRightCorner.y
            );
            ctx.lineTo(
              code.location.bottomLeftCorner.x,
              code.location.bottomLeftCorner.y
            );
            ctx.lineTo(
              code.location.topLeftCorner.x,
              code.location.topLeftCorner.y
            );
            ctx.stroke();
          }

          // Play success sound
          const successAudio = new Audio(
            "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHiNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2ysrKysrKysrKysrKysrKysrKysrKysrKy1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1v////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYJQ//zgwHgAAAOFpOUAAIDTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBlgAADlgAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBnAAADlIAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU="
          );

          successAudio
            .play()
            .catch((e) => console.log("Audio play prevented by browser"));

          // Process the QR code
          handleScannedQRCode(code.data);
          return;
        }
      } catch (error) {
        console.error("Error during QR code scanning:", error);
      }
    }

    // Continue scanning if no code found
    requestAnimationFrame(scanQRCode);
  };

  // Helper function for adaptive thresholding
  const adaptiveThreshold = (imageData) => {
    const width = imageData.width;
    const height = imageData.height;
    const grayData = new Uint8ClampedArray(width * height);

    // Convert to grayscale
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray =
        0.299 * imageData.data[i] +
        0.587 * imageData.data[i + 1] +
        0.114 * imageData.data[i + 2];
      grayData[i / 4] = gray;
    }

    // Apply adaptive threshold with larger window
    const windowSize = 15; // Use a 15x15 window
    const t = 10; // threshold value offset

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const grayIdx = y * width + x;

        let sum = 0;
        let count = 0;

        // Average of the surrounding pixels
        for (
          let j = Math.max(0, y - windowSize);
          j <= Math.min(height - 1, y + windowSize);
          j++
        ) {
          for (
            let i = Math.max(0, x - windowSize);
            i <= Math.min(width - 1, x + windowSize);
            i++
          ) {
            sum += grayData[j * width + i];
            count++;
          }
        }

        const avg = sum / count;
        const threshold = avg - t; // Slight offset to favor white

        const value = grayData[grayIdx] < threshold ? 0 : 255;
        imageData.data[idx] =
          imageData.data[idx + 1] =
          imageData.data[idx + 2] =
            value;
      }
    }
  };

  const stopQRScanner = () => {
    setQRScannerActive(false);
    setTorchActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      currentStreamRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (!currentStreamRef.current) return;

    try {
      const newTorchState = !torchActive;
      const track = currentStreamRef.current.getVideoTracks()[0];

      // Apply torch constraint
      await track.applyConstraints({
        advanced: [{ torch: newTorchState }],
      });

      setTorchActive(newTorchState);
    } catch (error) {
      console.error("Error toggling torch:", error);
      setSnackbar({
        open: true,
        message: "Failed to toggle flashlight",
        severity: "error",
      });
    }
  };

  const handleCloseQRScannerDialog = () => {
    setOpenQRScannerDialog(false);
    stopQRScanner();
  };

  const startQRScanner = async () => {
    if (!videoRef.current) return;

    setQRScannerActive(true);
    setScannerResult("Camera activating...");

    try {
      // Use the selected camera device
      let constraints = {};

      if (selectedCamera === "environment") {
        // Use environment facing camera with better resolution setting
        constraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 1.777777778 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        };
      } else {
        // Use specific camera by deviceId with better resolution setting
        constraints = {
          video: {
            deviceId: { exact: selectedCamera },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 1.777777778 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStreamRef.current = stream;

      videoRef.current.srcObject = stream;
      videoRef.current.play();

      // Check for torch/flashlight capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setTorchAvailable(capabilities.torch || false);

      // Set highest possible constraint settings for video
      try {
        const settings = track.getSettings();
        console.log("Camera settings:", settings);

        // Attempt to apply better focus mode
        if (
          capabilities.focusMode &&
          capabilities.focusMode.includes("continuous")
        ) {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" }],
          });
        }

        // Try to optimize exposure for QR scanning
        if (
          capabilities.exposureMode &&
          capabilities.exposureMode.includes("continuous")
        ) {
          await track.applyConstraints({
            advanced: [{ exposureMode: "continuous" }],
          });
        }
      } catch (e) {
        console.log("Error applying advanced camera constraints:", e);
      }

      // Once video is playing, start scanning
      videoRef.current.onloadedmetadata = () => {
        setScannerResult("Scanning for QR code...");
        requestAnimationFrame(scanQRCode);
      };
    } catch (error) {
      console.error("Error accessing camera:", error);
      setSnackbar({
        open: true,
        message: "Failed to access camera. Please allow camera permissions.",
        severity: "error",
      });
      setQRScannerActive(false);
      setScannerResult(
        "Camera access denied. Try using the manual QR entry option below."
      );
    }
  };

  const handleCameraChange = (event) => {
    setSelectedCamera(event.target.value);

    // If scanner is already active, restart it with the new camera
    if (qrScannerActive) {
      stopQRScanner();
      // Short delay to ensure camera is fully stopped
      setTimeout(() => {
        startQRScanner();
      }, 300);
    }
  };

  // Add state for direct loan entry
  const [showDirectLoanInput, setShowDirectLoanInput] = useState(true);
  const [directLoanId, setDirectLoanId] = useState("");

  const handleDirectLoanReturn = async () => {
    if (!directLoanId.trim() || !/^\d+$/.test(directLoanId.trim())) {
      setSnackbar({
        open: true,
        message: "Please enter a valid loan ID (numbers only)",
        severity: "error",
      });
      return;
    }

    setScannerResult("Processing loan return...");

    try {
      // Format the data for the API
      const data = JSON.stringify({
        loansIds: [parseInt(directLoanId.trim())],
      });

      const result = await window.api.returnBooksViaQR(data);

      if (result.success) {
        setScannerResult(result.message);
        setSnackbar({
          open: true,
          message: result.message,
          severity: "success",
        });

        // Refresh the loans list
        setTimeout(() => {
          fetchLoansByTab(activeTab);
          setDirectLoanId("");
          handleCloseQRScannerDialog();
        }, 2000);
      } else {
        setScannerResult(`Error: ${result.message}`);
        setSnackbar({
          open: true,
          message: result.message,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error processing loan return:", error);
      setScannerResult("Failed to process loan return");
      setSnackbar({
        open: true,
        message: "Failed to process loan return",
        severity: "error",
      });
    }
  };

  const getCameraDevices = () => {
    setCameras([]); // Reset cameras list

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        // Filter for video input devices and add a "Default camera" option
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );

        // Add a default option that uses environment facing camera
        const cameraOptions = [
          { deviceId: "environment", label: "Default (Back Camera)" },
          ...videoDevices,
        ];

        setCameras(cameraOptions);

        // Select the environment option by default
        setSelectedCamera("environment");

        console.log("Available cameras:", cameraOptions);
      })
      .catch((error) => {
        console.error("Error enumerating devices:", error);
        setSnackbar({
          open: true,
          message: "Failed to detect cameras",
          severity: "error",
        });
      });
  };

  const handleOpenQRScannerDialog = () => {
    setOpenQRScannerDialog(true);
    setScannerResult(null);
    setManualQRInput("");
    setShowDirectLoanInput(true); // Show direct loan input by default

    // Get available camera devices when opening the dialog
    getCameraDevices();
  };

  // Add a new function to repair the database
  const handleRepairDatabase = async () => {
    setIsRepairing(true);
    try {
      // Update the loans table schema
      await window.api.updateLoansTable();

      // Update book copies table schema
      await window.api.updateBookCopiesTable();

      // Call our new repair function to fix missing book_id fields
      try {
        const repairResult = await window.api.repairDatabase();
        console.log("Database repair result:", repairResult);

        if (repairResult && repairResult.success) {
          console.log(
            `Updated ${
              repairResult.updatedLoans?.length || 0
            } loans with book details`
          );
        }
      } catch (repairError) {
        console.error("Error during loan data repair:", repairError);
        // Continue with the process even if this specific repair fails
      }

      setSnackbar({
        open: true,
        message: "Database successfully updated. Reloading data...",
        severity: "success",
      });

      // Reload data using the existing fetchLoansByTab function
      await fetchLoansByTab(activeTab);

      // Also refresh the members and books lists
      const membersData = await window.api.getAllMembers();
      setMembers(membersData);

      const booksData = await window.api.getAllBooks();
      setBooks(booksData);
    } catch (error) {
      console.error("Error repairing database:", error);
      setSnackbar({
        open: true,
        message:
          "Failed to repair database: " + (error.message || "Unknown error"),
        severity: "error",
      });
    } finally {
      setIsRepairing(false);
    }
  };

  // Function to handle QR code popup
  const handleShowQRCode = async (loan, event) => {
    try {
      if (!loan || !loan.id) {
        console.error("Error: Missing loan data or invalid loan ID");
        setSnackbar({
          open: true,
          message: "Error: Missing loan data",
          severity: "error",
        });
        return;
      }

      console.log("Generating QR code for loan:", loan.id);

      // Create loan QR data
      const qrData = {
        transactionId: `LOAN-${Date.now()}-${loan.member_id}`,
        loanIds: [loan.id],
      };

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 150,
        margin: 1,
      });

      // Make sure the event target still exists in the DOM before using it
      if (
        event &&
        event.currentTarget &&
        document.contains(event.currentTarget)
      ) {
        setCurrentLoanQR(qrCodeUrl);
        setQrPopoverAnchor(event.currentTarget);
      } else {
        // If the event target is no longer in the DOM, show an error
        console.warn("Button element is no longer in the DOM");
        setSnackbar({
          open: true,
          message: "Could not show QR code. Please try again.",
          severity: "warning",
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      setSnackbar({
        open: true,
        message: `Error generating QR code: ${
          error.message || "Unknown error"
        }`,
        severity: "error",
      });
    }
  };

  const handleCloseQRPopover = () => {
    setQrPopoverAnchor(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: "var(--secondary-dark)" }}
        >
          Loan Management
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<LibraryBooksIcon />}
            onClick={handleOpenBorrowDialog}
            sx={{
              mr: 2,
              bgcolor: "var(--primary)",
              "&:hover": {
                bgcolor: "var(--primary-dark)",
              },
            }}
          >
            Borrow Books
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ReturnIcon />}
            onClick={handleOpenReturnDialog}
            sx={{ mr: 2 }}
          >
            Return Books
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<QrCodeScannerIcon />}
            onClick={handleOpenQRScannerDialog}
            sx={{ mr: 2 }}
          >
            Scan QR
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<AutorenewIcon />}
            onClick={handleRepairDatabase}
            disabled={isRepairing}
          >
            {isRepairing ? "Updating..." : "Update Schema"}
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CloseIcon />}
            onClick={handleOpenClearLoansDialog}
          >
            Clear All Loans
          </Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<LibraryBooksIcon />} label="Active Loans" />
          <Tab icon={<WarningIcon />} label="Overdue" />
          <Tab icon={<EventNoteIcon />} label="All Loans" />
        </Tabs>
      </Paper>

      <Paper elevation={3} sx={{ mb: 4, p: 2, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by member name, book title or ISBN..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      </Paper>

      {/* Add a message for users when there's a database error */}
      {loans.length === 0 && !loading && (
        <Paper
          elevation={3}
          sx={{ p: 3, mb: 3, bgcolor: "rgba(255, 243, 224, 0.8)" }}
        >
          <Typography variant="h6" color="warning.dark" gutterBottom>
            <WarningIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Database Schema Issue Detected
          </Typography>
          <Typography variant="body1" paragraph>
            It appears there might be an issue with the loans table in the
            database. This usually happens when the application has been updated
            with new features.
          </Typography>
          <Typography variant="body1" paragraph>
            Click the "Update Schema" button above to fix this issue.
          </Typography>
        </Paper>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: "var(--secondary-dark)" }}>
            <TableRow>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Book
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Copy Details
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Member
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Checkout Date
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Due Date
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Status
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLoans.length > 0 ? (
              filteredLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ mr: 1 }}>
                        {loan.book_cover ? (
                          <Box
                            component="img"
                            src={loan.book_cover}
                            alt={`Cover for ${loan.book_title}`}
                            sx={{
                              width: 40,
                              height: 60,
                              objectFit: "cover",
                              borderRadius: 1,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 40,
                              height: 60,
                              bgcolor: loan.book_color || "#6B4226",
                              borderRadius: 1,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              color: "#fff",
                              fontSize: "8px",
                              textAlign: "center",
                              lineHeight: 1,
                              p: 0.5,
                            }}
                          >
                            {loan.book_title}
                          </Box>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="body1">
                          {loan.book_title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ISBN: {loan.book_isbn}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      Barcode: {loan.book_barcode}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Location: {loan.book_location_code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1">{loan.member_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {loan.member_email}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(loan.checkout_date)}</TableCell>
                  <TableCell
                    sx={{
                      color: isLoanOverdue(loan) ? "error.main" : "inherit",
                    }}
                  >
                    {formatDate(loan.due_date)}
                  </TableCell>
                  <TableCell>{renderLoanStatus(loan)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Print Receipt">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            console.log("Generating receipt for loan:", loan);
                            handleGenerateReceipt(loan);
                          }}
                        >
                          <ReceiptIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Show QR Code">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={(e) => {
                            console.log("Showing QR for loan:", loan);
                            handleShowQRCode(loan, e);
                          }}
                        >
                          <QrCodeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {loan.status !== "Returned" && (
                        <Tooltip title="Return Book">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              console.log("Returning loan:", loan);
                              handleReturnSingleBook(loan.id);
                            }}
                          >
                            <AssignmentReturnedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box
                    sx={{
                      py: 3,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <LibraryBooksIcon
                      sx={{
                        fontSize: 40,
                        color: "var(--secondary-dark)",
                        opacity: 0.6,
                      }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      No loans found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? "Try different search terms"
                        : activeTab === 1
                        ? "No overdue books"
                        : "No active loans"}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Borrow Books Dialog */}
      <Dialog
        open={openBorrowDialog}
        onClose={handleCloseBorrowDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Borrow Books</Typography>
          {selectedMember && (
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Member: {selectedMember.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  borderColor: selectedMember ? "primary.main" : "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: 1,
                  },
                }}
                onClick={handleOpenMemberSelectDialog}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 56,
                    }}
                  >
                    <PersonIcon
                      sx={{ mr: 2, color: "primary.main", fontSize: 28 }}
                    />
                    {selectedMember ? (
                      <Box>
                        <Typography variant="subtitle1" component="div">
                          {selectedMember.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedMember.email}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="subtitle1" color="text.secondary">
                        Select a member to borrow books
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  borderColor:
                    selectedBooks.length > 0 ? "primary.main" : "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: 1,
                  },
                }}
                onClick={handleOpenBookSelectDialog}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 56,
                    }}
                  >
                    <BookIcon
                      sx={{ mr: 2, color: "primary.main", fontSize: 28 }}
                    />
                    {selectedBooks.length > 0 ? (
                      <Box>
                        <Typography variant="subtitle1" component="div">
                          {selectedBooks.length} book(s) selected
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Click to add more books
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="subtitle1" color="text.secondary">
                        Select books to borrow
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Checkout Date"
                type="date"
                value={checkoutDate}
                onChange={handleCheckoutDateChange}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  "& .MuiInputBase-root": {
                    minHeight: "56px",
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: checkoutDate, // Ensure due date is not before checkout date
                }}
                sx={{
                  "& .MuiInputBase-root": {
                    minHeight: "56px",
                  },
                }}
              />
            </Grid>

            {/* Selected Books Section */}
            {selectedBooks.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Selected Books ({selectedBooks.length})
                </Typography>
                <Box sx={{ mb: 3 }}>
                  {selectedBooks.map((book) => (
                    <Card key={book.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{ display: "flex", alignItems: "flex-start" }}
                          >
                            {getBookCoverDisplay(book)}
                            <Box>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "medium" }}
                              >
                                {book.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                by {book.author}
                              </Typography>
                              {book.isbn && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  ISBN: {book.isbn}
                                </Typography>
                              )}
                              <Chip
                                size="small"
                                label={book.category || "Uncategorized"}
                                sx={{ mt: 0.5, mr: 1 }}
                              />
                            </Box>
                          </Box>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBook(book.id);
                              }}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        {/* Available Copies for this book */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Available Copies:
                        </Typography>

                        {loadingCopies ? (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              p: 2,
                            }}
                          >
                            <CircularProgress size={24} />
                          </Box>
                        ) : availableCopiesByBook[book.id]?.copies?.length >
                          0 ? (
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell padding="checkbox">
                                    Select
                                  </TableCell>
                                  <TableCell>Barcode</TableCell>
                                  <TableCell>Location</TableCell>
                                  <TableCell>Shelf</TableCell>
                                  <TableCell>Condition</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {availableCopiesByBook[book.id]?.copies.map(
                                  (copy) => (
                                    <TableRow
                                      key={copy.id}
                                      onClick={() =>
                                        handleToggleCopySelection(copy.id)
                                      }
                                      sx={{
                                        cursor: "pointer",
                                        bgcolor: selectedBookCopies.includes(
                                          copy.id
                                        )
                                          ? "rgba(25, 118, 210, 0.08)"
                                          : "inherit",
                                        "&:hover": {
                                          bgcolor: selectedBookCopies.includes(
                                            copy.id
                                          )
                                            ? "rgba(25, 118, 210, 0.12)"
                                            : "rgba(0, 0, 0, 0.04)",
                                        },
                                      }}
                                    >
                                      <TableCell padding="checkbox">
                                        <Checkbox
                                          checked={selectedBookCopies.includes(
                                            copy.id
                                          )}
                                          onChange={() =>
                                            handleToggleCopySelection(copy.id)
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {copy.barcode || "N/A"}
                                      </TableCell>
                                      <TableCell>
                                        {copy.location_code || "N/A"}
                                      </TableCell>
                                      <TableCell>
                                        {copy.shelf_name
                                          ? `${copy.shelf_name}`
                                          : "Not on shelf"}
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          size="small"
                                          label={copy.condition || "Unknown"}
                                          color={
                                            copy.condition === "New"
                                              ? "success"
                                              : copy.condition === "Good"
                                              ? "info"
                                              : copy.condition === "Fair"
                                              ? "warning"
                                              : "error"
                                          }
                                          variant="outlined"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  )
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Alert severity="info" sx={{ mb: 1 }}>
                            No available copies for this book
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Grid>
            )}

            {/* Selected Copies Summary */}
            {selectedBookCopies.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: "primary.light", color: "white" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {selectedBookCopies.length}{" "}
                    {selectedBookCopies.length === 1 ? "copy" : "copies"}{" "}
                    selected for borrowing
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBorrowDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleBorrowBooks}
            variant="contained"
            color="primary"
            startIcon={<LibraryBooksIcon />}
            disabled={!selectedMember || selectedBookCopies.length === 0}
          >
            Borrow{" "}
            {selectedBookCopies.length > 0
              ? `${selectedBookCopies.length} Copies`
              : "Books"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Selection Dialog */}
      <Dialog
        open={openMemberSelectDialog}
        onClose={handleCloseMemberSelectDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Select Member</Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Search Members"
            type="text"
            fullWidth
            variant="outlined"
            value={memberSearchTerm}
            onChange={handleMemberSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
            <List sx={{ padding: 0 }}>
              {filteredMembers.map((member) => (
                <ListItem
                  key={member.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 1,
                    p: 1,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  onClick={() => handleMemberSelect(member)}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: "primary.main",
                        mr: 2,
                        width: 45,
                        height: 45,
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">{member.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Phone: {member.phone || "N/A"}
                      </Typography>
                    </Box>
                    <Chip
                      label={member.membership_type}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ ml: "auto" }}
                    />
                  </Box>
                </ListItem>
              ))}
              {filteredMembers.length === 0 && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <PersonIcon
                    sx={{ fontSize: 48, color: "text.secondary", opacity: 0.5 }}
                  />
                  <Typography variant="subtitle1" color="text.secondary">
                    No members found
                  </Typography>
                </Box>
              )}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMemberSelectDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Book Selection Dialog */}
      <Dialog
        open={openBookSelectDialog}
        onClose={handleCloseBookSelectDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Select Books</Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Search Available Books"
            type="text"
            fullWidth
            variant="outlined"
            value={bookSearchTerm}
            onChange={handleBookSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
            <Grid container spacing={2}>
              {filteredAvailableBooks.map((book) => (
                <Grid item xs={12} sm={6} key={book.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      borderColor: selectedBooks.some((b) => b.id === book.id)
                        ? "primary.main"
                        : "divider",
                      borderWidth: selectedBooks.some((b) => b.id === book.id)
                        ? 2
                        : 1,
                      "&:hover": {
                        boxShadow: 2,
                      },
                    }}
                    onClick={() => handleBookSelect(book)}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Box sx={{ display: "flex" }}>
                        <Box sx={{ mr: 2 }}>
                          {book.front_cover ? (
                            <Box
                              component="img"
                              src={book.front_cover}
                              alt={`Cover for ${book.title}`}
                              sx={{
                                width: 60,
                                height: 90,
                                objectFit: "cover",
                                borderRadius: 1,
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 60,
                                height: 90,
                                bgcolor: book.cover_color || "#6B4226",
                                borderRadius: 1,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                color: "#fff",
                                fontSize: "10px",
                                textAlign: "center",
                                lineHeight: 1,
                                p: 0.5,
                              }}
                            >
                              {book.title}
                            </Box>
                          )}
                        </Box>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "medium", mb: 0.5 }}
                          >
                            {book.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            by {book.author}
                          </Typography>
                          {book.isbn && (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              ISBN: {book.isbn}
                            </Typography>
                          )}
                          <Chip
                            label={book.category || "Uncategorized"}
                            size="small"
                            sx={{ mt: 1, fontSize: "0.7rem" }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {filteredAvailableBooks.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <BookIcon
                      sx={{
                        fontSize: 48,
                        color: "text.secondary",
                        opacity: 0.5,
                      }}
                    />
                    <Typography variant="subtitle1" color="text.secondary">
                      No available books found
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBookSelectDialog}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Return Books Dialog */}
      <Dialog
        open={openReturnDialog}
        onClose={handleCloseReturnDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Return Books</Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="dense"
                label="Search Loans"
                type="text"
                variant="outlined"
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ maxHeight: "400px", overflow: "auto", mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Select books to return:
                </Typography>
                {loans.length > 0 ? (
                  loans.map((loan) => (
                    <Card
                      key={loan.id}
                      sx={{
                        mb: 2,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: selectedLoans.some((l) => l.id === loan.id)
                          ? "primary.main"
                          : "divider",
                        borderWidth: selectedLoans.some((l) => l.id === loan.id)
                          ? 2
                          : 1,
                        transition: "all 0.2s",
                        "&:hover": {
                          boxShadow: 1,
                        },
                      }}
                      onClick={() => {
                        if (selectedLoans.some((l) => l.id === loan.id)) {
                          setSelectedLoans(
                            selectedLoans.filter((l) => l.id !== loan.id)
                          );
                        } else {
                          setSelectedLoans([...selectedLoans, loan]);
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Box sx={{ mr: 2 }}>
                              {loan.book_cover ? (
                                <Box
                                  component="img"
                                  src={loan.book_cover}
                                  alt={`Cover for ${loan.book_title}`}
                                  sx={{
                                    width: 50,
                                    height: 75,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 50,
                                    height: 75,
                                    bgcolor: loan.book_color || "#6B4226",
                                    borderRadius: 1,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    color: "#fff",
                                    fontSize: "9px",
                                    textAlign: "center",
                                    lineHeight: 1,
                                    p: 0.5,
                                  }}
                                >
                                  {loan.book_title}
                                </Box>
                              )}
                            </Box>
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: "bold" }}
                              >
                                {loan.book_title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Borrowed by: {loan.member_name}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mt: 1,
                                }}
                              >
                                <CalendarIcon
                                  sx={{
                                    fontSize: 14,
                                    mr: 0.5,
                                    color: "text.secondary",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ mr: 1 }}
                                >
                                  Borrowed: {formatDate(loan.checkout_date)}
                                </Typography>
                                <CalendarIcon
                                  sx={{
                                    fontSize: 14,
                                    mr: 0.5,
                                    color: isLoanOverdue(loan)
                                      ? "error.main"
                                      : "text.secondary",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  color={
                                    isLoanOverdue(loan)
                                      ? "error.main"
                                      : "text.secondary"
                                  }
                                >
                                  Due: {formatDate(loan.due_date)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          {isLoanOverdue(loan) ? (
                            <Chip
                              icon={<WarningIcon />}
                              label="Overdue"
                              color="error"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={loan.status}
                              color="primary"
                              size="small"
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 4,
                      bgcolor: "background.paper",
                      borderRadius: 1,
                    }}
                  >
                    <LibraryBooksIcon
                      sx={{
                        fontSize: 48,
                        color: "text.secondary",
                        opacity: 0.5,
                      }}
                    />
                    <Typography variant="subtitle1" color="text.secondary">
                      No active loans found
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            {selectedLoans.length > 0 && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}
                >
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <ReturnIcon sx={{ mr: 1, color: "primary.main" }} />
                    Ready to Return ({selectedLoans.length} book
                    {selectedLoans.length !== 1 ? "s" : ""})
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}
                  >
                    {selectedLoans.map((loan) => (
                      <Chip
                        key={loan.id}
                        label={loan.book_title}
                        onDelete={() =>
                          setSelectedLoans(
                            selectedLoans.filter((l) => l.id !== loan.id)
                          )
                        }
                        color={isLoanOverdue(loan) ? "error" : "primary"}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnDialog}>Cancel</Button>
          <Button
            onClick={handleReturnBooks}
            variant="contained"
            color="primary"
            startIcon={<ReturnIcon />}
            disabled={selectedLoans.length === 0}
          >
            Return Books
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={openReceiptDialog}
        onClose={handleCloseReceiptDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Borrowing Receipt</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handlePrintReceipt}
            >
              Print
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box ref={receiptRef} sx={{ p: 2 }}>
            <Box className="receipt">
              <Box className="receipt-header">
                <Typography className="library-name" variant="h6">
                  Hiraya Balanghay Library
                </Typography>
                <Typography className="receipt-title" variant="subtitle2">
                  Book Loan Receipt
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Box className="member-details">
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: "bold", mb: 1 }}
                    >
                      Member Information
                    </Typography>
                    <Box className="detail-row">
                      <Typography variant="body2">Name:</Typography>
                      <Typography variant="body2">
                        {receiptData?.member?.name}
                      </Typography>
                    </Box>
                    <Box className="detail-row">
                      <Typography variant="body2">ID:</Typography>
                      <Typography variant="body2">
                        {receiptData?.member?.id}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className="loan-details" sx={{ mt: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: "bold", mb: 1 }}
                    >
                      Loan Information
                    </Typography>
                    <Box className="detail-row">
                      <Typography variant="body2">Transaction:</Typography>
                      <Typography variant="body2">
                        {receiptData?.transactionId?.split("-")[1]}
                      </Typography>
                    </Box>
                    <Box className="detail-row">
                      <Typography variant="body2">Checkout:</Typography>
                      <Typography variant="body2">
                        {formatDate(receiptData?.checkoutDate)}
                      </Typography>
                    </Box>
                    <Box className="detail-row">
                      <Typography variant="body2">Due Date:</Typography>
                      <Typography variant="body2" className="due-date">
                        {formatDate(receiptData?.dueDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box className="qr-section">
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      {qrCodeData && (
                        <Box
                          component="img"
                          src={qrCodeData}
                          alt="Loan QR Code"
                          sx={{
                            width: 120,
                            height: 120,
                            border: "1px solid #eee",
                            borderRadius: 1,
                            p: 1,
                          }}
                        />
                      )}
                      <Typography
                        variant="caption"
                        sx={{ mt: 1, fontStyle: "italic" }}
                      >
                        Scan for quick return
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                Borrowed Items ({receiptData?.books?.length || 0})
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        Title
                      </TableCell>
                      <TableCell padding="none">Author</TableCell>
                      <TableCell padding="none">Copy Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {receiptData?.books?.map((book, index) => (
                      <TableRow key={book.id}>
                        <TableCell padding="none" sx={{ pl: 1 }}>
                          {book.title}
                        </TableCell>
                        <TableCell padding="none">{book.author}</TableCell>
                        <TableCell padding="none">
                          {receiptData?.bookCopies &&
                          receiptData.bookCopies[index] ? (
                            <Box>
                              <Typography variant="caption" display="block">
                                Barcode:{" "}
                                {receiptData.bookCopies[index].barcode || "N/A"}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Location:{" "}
                                {receiptData.bookCopies[index].locationCode ||
                                  "N/A"}
                              </Typography>
                            </Box>
                          ) : (
                            "No copy details"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box className="footer">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Thank you for using Hiraya Balanghay Library!
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                  Please keep this receipt and return by:{" "}
                  {formatDate(receiptData?.dueDate)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReceiptDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Scanner Dialog */}
      <Dialog
        open={openQRScannerDialog}
        onClose={handleCloseQRScannerDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Return Books</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {/* Direct Loan ID input section - more prominent */}
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                mb: 3,
                bgcolor: "#f8f9fa",
                border: "1px solid #e0e0e0",
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Quick Return by Loan ID
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the loan ID number to quickly return books without
                scanning:
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="medium"
                    variant="outlined"
                    label="Loan ID"
                    placeholder="Enter loan ID number"
                    value={directLoanId}
                    onChange={(e) => setDirectLoanId(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ReturnIcon />
                        </InputAdornment>
                      ),
                    }}
                    helperText="You can find the loan ID in active loans table"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleDirectLoanReturn}
                    disabled={
                      !directLoanId.trim() || !/^\d+$/.test(directLoanId.trim())
                    }
                    sx={{ height: "56px" }}
                  >
                    Return Book
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Divider sx={{ my: 3, borderStyle: "dashed" }}>
              <Chip label="OR" />
            </Divider>

            <Typography
              variant="subtitle1"
              fontWeight="bold"
              gutterBottom
              align="center"
            >
              Return Books by QR Code
            </Typography>

            {/* Camera selection dropdown */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={8}>
                <FormControl variant="outlined" size="small" fullWidth>
                  <InputLabel>Camera</InputLabel>
                  <Select
                    value={selectedCamera}
                    onChange={handleCameraChange}
                    label="Camera"
                    disabled={qrScannerActive}
                  >
                    {cameras.map((camera, index) => (
                      <MenuItem
                        key={camera.deviceId || index}
                        value={camera.deviceId}
                      >
                        {camera.label || `Camera ${index + 1}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={getCameraDevices}
                  disabled={qrScannerActive}
                >
                  Refresh Cameras
                </Button>
              </Grid>
            </Grid>

            {/* Camera view or instruction */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: 400,
                height: 400,
                margin: "0 auto",
                display: qrScannerActive ? "block" : "none",
                border: "2px solid #ccc",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              {/* Hidden canvas for image processing */}
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* Scanner visualization overlay */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: "none",
                }}
              >
                {/* Corner brackets for scanner targeting aid */}
                <Box
                  sx={{
                    position: "absolute",
                    top: "20%",
                    left: "20%",
                    width: "60%",
                    height: "60%",
                    border: "2px solid rgba(76, 175, 80, 0.8)",
                    borderRadius: 1,
                    boxShadow: "0 0 0 4000px rgba(0, 0, 0, 0.4)",
                    "&::before, &::after, & > :nth-of-type(1)::before, & > :nth-of-type(1)::after":
                      {
                        content: '""',
                        position: "absolute",
                        width: 20,
                        height: 20,
                        borderColor: "#4caf50",
                        borderStyle: "solid",
                        borderWidth: 0,
                      },
                    // Top left corner
                    "&::before": {
                      top: -2,
                      left: -2,
                      borderTopWidth: 4,
                      borderLeftWidth: 4,
                      borderTopLeftRadius: 4,
                    },
                    // Top right corner
                    "&::after": {
                      top: -2,
                      right: -2,
                      borderTopWidth: 4,
                      borderRightWidth: 4,
                      borderTopRightRadius: 4,
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      // Bottom left corner
                      "&::before": {
                        bottom: -2,
                        left: -2,
                        borderBottomWidth: 4,
                        borderLeftWidth: 4,
                        borderBottomLeftRadius: 4,
                      },
                      // Bottom right corner
                      "&::after": {
                        bottom: -2,
                        right: -2,
                        borderBottomWidth: 4,
                        borderRightWidth: 4,
                        borderBottomRightRadius: 4,
                      },
                    }}
                  />
                </Box>

                {/* Laser animation */}
                <Box
                  sx={{
                    position: "absolute",
                    top: "20%",
                    left: "20%",
                    width: "60%",
                    height: 2,
                    backgroundColor: "rgba(255, 0, 0, 0.7)",
                    boxShadow: "0 0 8px rgba(255, 0, 0, 0.9)",
                    animation: "scannerAnimation 2s linear infinite",
                    "@keyframes scannerAnimation": {
                      "0%": {
                        top: "20%",
                      },
                      "50%": {
                        top: "80%",
                      },
                      "100%": {
                        top: "20%",
                      },
                    },
                  }}
                />

                {/* Scan instructions overlay */}
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    bottom: 50,
                    left: 0,
                    right: 0,
                    color: "#fff",
                    textAlign: "center",
                    background: "rgba(0,0,0,0.5)",
                    padding: "4px 0",
                  }}
                >
                  Hold steady, ensure good lighting
                </Typography>

                {/* Flashlight toggle button */}
                {torchAvailable && (
                  <IconButton
                    onClick={toggleTorch}
                    sx={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                      },
                      pointerEvents: "auto",
                    }}
                    size="small"
                  >
                    {torchActive ? <FlashOffIcon /> : <FlashOnIcon />}
                  </IconButton>
                )}
              </Box>
            </Box>

            {!qrScannerActive && !scannerResult && (
              <Box sx={{ mb: 2, textAlign: "center" }}>
                <QrCodeScannerIcon
                  sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
                />
                <Typography variant="body1">
                  Scan a QR code from a loan receipt to quickly return books.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={startQRScanner}
                  disabled={cameras.length === 0}
                  sx={{ mt: 2 }}
                >
                  Start Scanning
                </Button>
              </Box>
            )}

            {/* Result message */}
            {scannerResult && (
              <Box sx={{ mb: 2, mt: 2, textAlign: "center" }}>
                <Typography
                  variant="subtitle1"
                  color={
                    scannerResult.includes("Error")
                      ? "error"
                      : scannerResult.includes("Processing")
                      ? "primary.main"
                      : scannerResult.includes("Camera") ||
                        scannerResult.includes("Scanning")
                      ? "text.secondary"
                      : "success.main"
                  }
                  sx={{ fontWeight: "medium", mb: 1 }}
                >
                  {scannerResult}
                </Typography>
              </Box>
            )}

            {/* Manual QR code entry form */}
            <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Manual QR Code Entry
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 2 }}
              >
                If scanning doesn't work, you can paste the entire QR code data
                here:
              </Typography>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label="Enter QR code data"
                placeholder="Paste the QR code content here"
                value={manualQRInput}
                onChange={(e) => setManualQRInput(e.target.value)}
                multiline
                rows={3}
                sx={{ mb: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleManualQRSubmit}
                disabled={manualQRInput.trim() === ""}
              >
                Process QR Data
              </Button>
            </Paper>

            {/* Debug actions */}
            {qrScannerActive && (
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Button
                  variant="outlined"
                  color="info"
                  onClick={captureSnapshot}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  Capture Snapshot
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={stopQRScanner}
                  size="small"
                >
                  Stop Scanning
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQRScannerDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Debug Image Dialog */}
      <Dialog
        open={showDebugImage}
        onClose={() => setShowDebugImage(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Camera Snapshot</DialogTitle>
        <DialogContent>
          {debugImage && (
            <Box sx={{ textAlign: "center" }}>
              <img
                src={debugImage}
                alt="Camera snapshot"
                style={{ maxWidth: "100%", maxHeight: "70vh" }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                If your QR code is visible but not scanning, try different
                lighting or holding the device more steadily.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDebugImage(false)}>Close</Button>
          {debugImage && (
            <Button
              component="a"
              href={debugImage}
              download="qr-scan-debug.png"
              variant="contained"
            >
              Download Image
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ mb: 2, mr: 2 }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            boxShadow: 3,
            "& .MuiAlert-icon": {
              fontSize: "1.5rem",
              alignItems: "center",
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Clear Loans Confirmation Dialog */}
      <Dialog
        open={openClearLoansDialog}
        onClose={handleCloseClearLoansDialog}
        aria-labelledby="clear-loans-dialog-title"
      >
        <DialogTitle id="clear-loans-dialog-title">Clear All Loans</DialogTitle>
        <DialogContent>
          <Typography>
            This will delete ALL loans from the database and reset all checked
            out book copies to "Available" status. This action cannot be undone.
          </Typography>
          <Typography sx={{ mt: 2, fontWeight: "bold", color: "error.main" }}>
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClearLoansDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleClearAllLoans}
            color="error"
            variant="contained"
            disabled={isClearingLoans}
            startIcon={
              isClearingLoans ? <CircularProgress size={20} /> : <CloseIcon />
            }
          >
            {isClearingLoans ? "Clearing..." : "Clear All Loans"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Popover */}
      <Popover
        open={Boolean(qrPopoverAnchor)}
        anchorEl={qrPopoverAnchor}
        onClose={handleCloseQRPopover}
        anchorOrigin={{
          vertical: "center",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 2, textAlign: "center" }}>
          {currentLoanQR && (
            <>
              <Box
                component="img"
                src={currentLoanQR}
                alt="Loan QR Code"
                sx={{ width: 150, height: 150 }}
              />
              <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                Scan to return this book
              </Typography>
            </>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export default LoanManagement;
