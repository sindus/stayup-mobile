import { render, screen } from "@testing-library/react-native"
import { LoadingScreen } from "@/components/ui/LoadingScreen"

describe("LoadingScreen", () => {
  it("renders without a message", () => {
    render(<LoadingScreen />)
    expect(screen.queryByText("Chargement…")).toBeNull()
  })

  it("renders the message when provided", () => {
    render(<LoadingScreen message="Chargement…" />)
    expect(screen.getByText("Chargement…")).toBeTruthy()
  })
})
