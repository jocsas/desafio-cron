import { Container, Typography, Paper, Divider, Box } from "@mui/material";
import CronManager from "./components/CronManager";

function App() {
  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      <Paper sx={{ padding: 3, boxShadow: 3 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Gestão de CRONs
        </Typography>

        <Divider sx={{ marginY: 2 }} />

        <Box>
          <CronManager />
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
