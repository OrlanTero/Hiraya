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
} from "@mui/icons-material";

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
      setLoans(loansData);
    } catch (error) {
      console.error("Error fetching loans:", error);
      setSnackbar({
        open: true,
        message: "Failed to load loans",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
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
  };

  const handleOpenReturnDialog = () => {
    setSelectedLoans([]);
    setOpenReturnDialog(true);
  };

  const handleCloseReturnDialog = () => {
    setOpenReturnDialog(false);
  };

  const handleBorrowBooks = async () => {
    if (!selectedMember) {
      setSnackbar({
        open: true,
        message: "Please select a member",
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
      const memberData = {
        member_id: selectedMember.id,
        book_ids: selectedBooks.map((book) => book.id),
        checkout_date: checkoutDate,
        due_date: dueDate,
      };

      const result = await window.api.borrowBooks(memberData);

      // Generate a unique transaction ID for QR code
      const transactionId = `LOAN-${Date.now()}-${selectedMember.id}`;

      // Prepare receipt data
      setReceiptData({
        transactionId,
        member: selectedMember,
        books: selectedBooks,
        checkoutDate,
        dueDate,
        loansIds: Array.isArray(result) ? result.map(loan => loan.id) : [],
      });

      // Show receipt
      setOpenReceiptDialog(true);
      
      setSnackbar({
        open: true,
        message: `${selectedBooks.length} books borrowed successfully`,
        severity: "success",
      });

      // Refresh the loans list
      fetchLoansByTab(activeTab);

      // Refresh available books
      const updatedBooks = await window.api.getAllBooks();
      setBooks(updatedBooks);

      // Close the dialog
      handleCloseBorrowDialog();
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
        message: "Please select at least one loan to return",
        severity: "error",
      });
      return;
    }

    try {
      await window.api.returnBooks(selectedLoans.map((loan) => loan.id));

      setSnackbar({
        open: true,
        message: `${selectedLoans.length} books returned successfully`,
        severity: "success",
      });

      // Refresh the loans list
      fetchLoansByTab(activeTab);

      // Refresh available books
      const updatedBooks = await window.api.getAllBooks();
      setBooks(updatedBooks);

      // Close the dialog
      handleCloseReturnDialog();
    } catch (error) {
      console.error("Error returning books:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to return books"}`,
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

  const handleOpenBookSelectDialog = () => {
    setBookSearchTerm("");
    setOpenBookSelectDialog(true);
  };

  const handleCloseBookSelectDialog = () => {
    setOpenBookSelectDialog(false);
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setOpenMemberSelectDialog(false);
  };

  const handleBookSelect = (book) => {
    if (!selectedBooks.some((selectedBook) => selectedBook.id === book.id)) {
      setSelectedBooks([...selectedBooks, book]);
    }
  };

  const handleRemoveBook = (bookId) => {
    setSelectedBooks(selectedBooks.filter((book) => book.id !== bookId));
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
      const originalContents = document.body.innerHTML;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write('<html><head><title>Loan Receipt</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: Arial, sans-serif; padding: 20px; }
        .receipt { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
        .receipt-header { text-align: center; margin-bottom: 20px; }
        .library-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .receipt-title { font-size: 18px; margin-bottom: 20px; }
        .qr-section { text-align: center; margin: 20px 0; }
        .member-details, .loan-details { margin-bottom: 20px; }
        .book-list { margin-top: 10px; }
        .book-item { padding: 10px; border-bottom: 1px solid #eee; }
        .book-title { font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; }
        .signature-line { margin-top: 50px; border-top: 1px solid #000; width: 200px; display: inline-block; }
        .due-date { color: #c6121f; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { font-weight: bold; background-color: #f2f2f2; }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</body></html>');
      
      printWindow.document.close();
      printWindow.focus();
      
      // Print after a short delay to ensure content is rendered
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Generate QR code data
  const generateQRData = (data) => {
    if (!data) return "";
    
    const qrData = {
      transactionId: data.transactionId,
      memberId: data.member.id,
      memberName: data.member.name,
      loansIds: data.loansIds,
      checkoutDate: data.checkoutDate,
      dueDate: data.dueDate,
    };
    
    return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(JSON.stringify(qrData))}`;
  };

  const handleOpenQRScannerDialog = () => {
    setOpenQRScannerDialog(true);
    setScannerResult(null);
  };

  const handleCloseQRScannerDialog = () => {
    setOpenQRScannerDialog(false);
    stopQRScanner();
  };

  const startQRScanner = async () => {
    if (!videoRef.current) return;
    
    setQRScannerActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      videoRef.current.srcObject = stream;
      
      // If using a library for QR scanning, initialize it here
      // For this example, we'll simulate a scan by setting a timeout
      setTimeout(() => {
        if (qrScannerActive) {
          simulateQRScan();
        }
      }, 3000);
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      setSnackbar({
        open: true,
        message: "Failed to access camera. Please allow camera permissions.",
        severity: "error",
      });
      setQRScannerActive(false);
    }
  };
  
  const stopQRScanner = () => {
    setQRScannerActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  // This is a simulation for demo purposes
  // In a real app, you'd use a library like jsQR or similar
  const simulateQRScan = () => {
    // Mock QR scan result containing loan information
    const mockQRData = {
      transactionId: `LOAN-${Date.now()}-1`,
      memberId: 1,
      memberName: "John Doe",
      loansIds: [1, 2],
      checkoutDate: "2023-10-01",
      dueDate: "2023-10-15"
    };
    
    // Handle the scanned QR code
    handleScannedQRCode(JSON.stringify(mockQRData));
  };
  
  const handleScannedQRCode = async (qrData) => {
    stopQRScanner();
    
    try {
      setScannerResult("Processing QR code...");
      
      const result = await window.api.returnBooksViaQR(qrData);
      
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
          >
            Scan QR
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

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: "var(--secondary-dark)" }}>
            <TableRow>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Book
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Borrow Books</Typography>
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

            {selectedBooks.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Books ({selectedBooks.length})
                </Typography>
                <Box sx={{ maxHeight: "250px", overflow: "auto" }}>
                  {selectedBooks.map((book) => (
                    <Card key={book.id} sx={{ mb: 1 }}>
                      <CardContent
                        sx={{ py: 1, px: 2, "&:last-child": { pb: 1 } }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {getBookCoverDisplay(book)}
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: "medium" }}
                              >
                                {book.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                by {book.author}
                              </Typography>
                            </Box>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveBook(book.id)}
                            sx={{ color: "error.main" }}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBorrowDialog}>Cancel</Button>
          <Button
            onClick={handleBorrowBooks}
            variant="contained"
            color="primary"
            startIcon={<LibraryBooksIcon />}
            disabled={!selectedMember || selectedBooks.length === 0}
          >
            Borrow Books
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                <Typography className="library-name" variant="h5">
                  Hiraya Balanghay Library
                </Typography>
                <Typography className="receipt-title" variant="subtitle1">
                  Book Loan Receipt
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Box className="member-details">
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                      Member Information
                    </Typography>
                    <Typography variant="body1">
                      Name: {receiptData?.member?.name}
                    </Typography>
                    <Typography variant="body1">
                      Email: {receiptData?.member?.email}
                    </Typography>
                    <Typography variant="body1">
                      ID: {receiptData?.member?.id}
                    </Typography>
                  </Box>
                  
                  <Box className="loan-details">
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                      Loan Information
                    </Typography>
                    <Typography variant="body1">
                      Transaction ID: {receiptData?.transactionId}
                    </Typography>
                    <Typography variant="body1">
                      Checkout Date: {formatDate(receiptData?.checkoutDate)}
                    </Typography>
                    <Typography variant="body1" className="due-date">
                      Due Date: {formatDate(receiptData?.dueDate)}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                      Please return all items by the due date to avoid fines.
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box className="qr-section">
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <QrCodeIcon sx={{ fontSize: 40, mb: 1, color: "primary.main" }} />
                      {receiptData && (
                        <Box
                          component="img"
                          src={generateQRData(receiptData)}
                          alt="Loan QR Code"
                          sx={{ 
                            width: 150,
                            height: 150,
                            border: "1px solid #eee",
                            borderRadius: 1,
                            p: 1,
                          }}
                        />
                      )}
                      <Typography variant="caption" sx={{ mt: 1, fontStyle: "italic" }}>
                        Scan for quick return
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                Borrowed Items ({receiptData?.books?.length || 0})
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Author</TableCell>
                      <TableCell>ISBN</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {receiptData?.books?.map((book, index) => (
                      <TableRow key={book.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>{book.isbn || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box className="footer" sx={{ mt: 4, textAlign: "center" }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Thank you for using Hiraya Balanghay Library!
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                  Please keep this receipt for your records.
                </Typography>
              </Box>
              
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography className="signature-line">&nbsp;</Typography>
                  <Typography variant="body2">Librarian Signature</Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography className="signature-line">&nbsp;</Typography>
                  <Typography variant="body2">Member Signature</Typography>
                </Box>
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Scan Return QR Code</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: "center", py: 2 }}>
            {!qrScannerActive && !scannerResult && (
              <Box sx={{ mb: 2 }}>
                <QrCodeScannerIcon 
                  sx={{ fontSize: 60, color: "primary.main", mb: 2 }} 
                />
                <Typography variant="body1">
                  Scan a QR code from a loan receipt to quickly return books.
                </Typography>
              </Box>
            )}
            
            {scannerResult && (
              <Box sx={{ mb: 2, mt: 2 }}>
                <Typography 
                  variant="subtitle1" 
                  color={scannerResult.includes("Error") ? "error" : "success.main"}
                  sx={{ fontWeight: "medium", mb: 1 }}
                >
                  {scannerResult}
                </Typography>
              </Box>
            )}
            
            <Box 
              sx={{ 
                position: "relative", 
                width: "100%", 
                maxWidth: 300,
                height: 300,
                margin: "0 auto",
                display: qrScannerActive ? "block" : "none",
                border: "2px solid #ccc",
                borderRadius: 2,
                overflow: "hidden"
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
                  objectFit: "cover" 
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: "40px solid rgba(0,0,0,0.3)",
                  boxSizing: "border-box",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "65%",
                    height: "65%",
                    transform: "translate(-50%, -50%)",
                    border: "2px solid #4caf50",
                    borderRadius: 2,
                  }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          {!qrScannerActive && !scannerResult && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<QrCodeScannerIcon />}
              onClick={startQRScanner}
            >
              Start Scanning
            </Button>
          )}
          {qrScannerActive && (
            <Button
              variant="outlined"
              color="error"
              onClick={stopQRScanner}
            >
              Stop Scanning
            </Button>
          )}
          <Button onClick={handleCloseQRScannerDialog}>
            Close
          </Button>
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
    </Box>
  );
};

export default LoanManagement;
