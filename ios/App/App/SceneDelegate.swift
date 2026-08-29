import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    /// Matches web `--app-bg` / Capacitor `ios.backgroundColor` (#f7f3ef).
    private static let appBackground = UIColor(
        red: 247.0 / 255.0,
        green: 243.0 / 255.0,
        blue: 239.0 / 255.0,
        alpha: 1.0
    )

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let bridge = CAPBridgeViewController()
        bridge.view.backgroundColor = Self.appBackground

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = Self.appBackground
        window?.rootViewController = bridge
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
