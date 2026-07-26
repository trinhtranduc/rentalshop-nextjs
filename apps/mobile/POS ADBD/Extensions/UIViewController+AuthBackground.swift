import UIKit

extension UIViewController {
    /// Installs a full-screen background image for auth entry screens
    /// (splash, login, forgot password, register).
    func installAuthEntryBackground() {
        let imageView = UIImageView(image: UIImage(named: "anyrent-auth-background"))
        imageView.contentMode = .scaleAspectFill
        imageView.translatesAutoresizingMaskIntoConstraints = false
        view.insertSubview(imageView, at: 0)
        NSLayoutConstraint.activate([
            imageView.topAnchor.constraint(equalTo: view.topAnchor),
            imageView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            imageView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }
}
